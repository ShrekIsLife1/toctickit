import { Request, Response } from "express";
import { getPrisma } from "./prisma.js";

// Cache for Idempotency-Key support (AC-19, FR-17)
const idempotencyCache = new Map<string, { timestamp: number; data: any }>();
const IDEMPOTENCY_TTL_MS = 60 * 1000;

function cleanExpiredIdempotencyKeys() {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
}

export function validateActionInput(body: any, isUpdate = false) {
  const errors: string[] = [];

  // actionDateTime
  let actionDateTime: Date | undefined;
  if (body.actionDateTime !== undefined && body.actionDateTime !== null) {
    actionDateTime = new Date(body.actionDateTime);
    if (isNaN(actionDateTime.getTime())) {
      errors.push("Invalid action date/time format.");
    } else if (actionDateTime.getTime() > Date.now() + 5 * 60 * 1000) {
      errors.push("Action date/time cannot be more than 5 minutes in the future.");
    }
  } else if (!isUpdate) {
    actionDateTime = new Date();
  }

  // description
  let description: string | undefined;
  if (!isUpdate || body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length === 0) {
      errors.push("Action description is required.");
    } else if (body.description.trim().length > 2000) {
      errors.push("Action description cannot exceed 2000 characters.");
    } else {
      description = body.description.trim();
    }
  }

  // result
  let result: string | undefined;
  if (!isUpdate || body.result !== undefined) {
    if (typeof body.result !== "string" || body.result.trim().length === 0) {
      errors.push("Result is required.");
    } else if (body.result.trim().length > 1000) {
      errors.push("Result cannot exceed 1000 characters.");
    } else {
      result = body.result.trim();
    }
  }

  // followUpRequired & followUpNote
  const followUpRequired = body.followUpRequired === true;
  let followUpNote: string | null | undefined;

  if (followUpRequired) {
    if (typeof body.followUpNote !== "string" || body.followUpNote.trim().length === 0) {
      errors.push("Follow-up note is required when follow-up is requested.");
    } else if (body.followUpNote.trim().length > 1000) {
      errors.push("Follow-up note cannot exceed 1000 characters.");
    } else {
      followUpNote = body.followUpNote.trim();
    }
  } else if (body.followUpNote !== undefined) {
    if (typeof body.followUpNote === "string" && body.followUpNote.trim().length > 1000) {
      errors.push("Follow-up note cannot exceed 1000 characters.");
    } else {
      followUpNote = typeof body.followUpNote === "string" && body.followUpNote.trim().length > 0
        ? body.followUpNote.trim()
        : null;
    }
  }

  // attachmentNotes
  let attachmentNotes: string | null | undefined;
  if (body.attachmentNotes !== undefined && body.attachmentNotes !== null) {
    if (typeof body.attachmentNotes !== "string") {
      errors.push("Attachment notes must be a string.");
    } else if (body.attachmentNotes.trim().length > 500) {
      errors.push("Attachment notes cannot exceed 500 characters.");
    } else {
      attachmentNotes = body.attachmentNotes.trim().length > 0 ? body.attachmentNotes.trim() : null;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      actionDateTime,
      description,
      result,
      followUpRequired,
      followUpNote,
      attachmentNotes,
    },
  };
}

export async function getActionsTakenHandler(req: Request, res: Response) {
  const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
  const ticketId = Number(req.params.id);

  if (isNaN(ticketId)) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    // Role-based visibility (BR-10, BR-11, AC-06)
    if (currentUser.role === "REQUESTER" && ticket.requesterId !== currentUser.id) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      orderBy: [
        { actionDateTime: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
      include: {
        performedBy: { select: { id: true, name: true, email: true, role: true } },
        updatedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.status(200).json(actions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to retrieve actions taken" } });
  }
}

export async function createActionTakenHandler(req: Request, res: Response) {
  const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
  const ticketId = Number(req.params.id);

  if (isNaN(ticketId)) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  }

  // Authorization (BR-10, AC-05)
  if (currentUser.role === "REQUESTER") {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Requesters are not permitted to create Actions Taken." },
    });
  }

  const idempotencyKey = req.header("Idempotency-Key");
  if (idempotencyKey) {
    cleanExpiredIdempotencyKeys();
    const cacheKey = `${currentUser.id}:${ticketId}:${idempotencyKey}`;
    const cached = idempotencyCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached.data);
    }
  }

  const validation = validateActionInput(req.body, false);
  if (!validation.isValid) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: validation.errors[0], details: validation.errors },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    // BR-09, AC-12: Actions cannot be created on Cancelled tickets
    if (ticket.currentStatus === "CANCELLED") {
      return res.status(409).json({
        error: { code: "CANCELLED_TICKET_IMMUTABLE", message: "Cannot add Actions Taken to a Cancelled ticket." },
      });
    }

    const { actionDateTime, description, result, followUpRequired, followUpNote, attachmentNotes } = validation.data;

    // BR-03: Performed by is automatic from session user
    const createdAction = await prisma.$transaction(async (tx) => {
      const act = await tx.actionTaken.create({
        data: {
          ticketId,
          actionDateTime: actionDateTime!,
          description: description!,
          result: result!,
          performedById: currentUser.id,
          followUpRequired,
          followUpNote,
          attachmentNotes,
          version: 1,
        },
        include: {
          performedBy: { select: { id: true, name: true, email: true, role: true } },
          updatedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // BR-13: Updates parent Ticket.updatedAt
      await tx.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      return act;
    });

    if (idempotencyKey) {
      const cacheKey = `${currentUser.id}:${ticketId}:${idempotencyKey}`;
      idempotencyCache.set(cacheKey, { timestamp: Date.now(), data: createdAction });
    }

    res.status(201).json(createdAction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to create action taken" } });
  }
}

export async function updateActionTakenHandler(req: Request, res: Response) {
  const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
  const ticketId = Number(req.params.id);
  const actionId = Number(req.params.actionId);

  if (isNaN(ticketId) || isNaN(actionId)) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Action or Ticket not found" } });
  }

  // Authorization (BR-10, AC-05)
  if (currentUser.role === "REQUESTER") {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Requesters are not permitted to edit Actions Taken." },
    });
  }

  const { expectedVersion } = req.body;
  if (typeof expectedVersion !== "number") {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "expectedVersion is required as a number for concurrency control." },
    });
  }

  const validation = validateActionInput(req.body, true);
  if (!validation.isValid) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: validation.errors[0], details: validation.errors },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    // BR-09, AC-12
    if (ticket.currentStatus === "CANCELLED") {
      return res.status(409).json({
        error: { code: "CANCELLED_TICKET_IMMUTABLE", message: "Cannot edit Actions Taken on a Cancelled ticket." },
      });
    }

    const existingAction = await prisma.actionTaken.findFirst({
      where: { id: actionId, ticketId },
    });

    if (!existingAction) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Action Taken not found" } });
    }

    // BR-17, AC-07: Optimistic concurrency control
    if (existingAction.version !== expectedVersion) {
      return res.status(409).json({
        error: {
          code: "STALE_UPDATE",
          message: "This Action Taken has been modified by another user. Please reload the latest changes.",
          details: { currentVersion: existingAction.version },
        },
      });
    }

    const { actionDateTime, description, result, followUpRequired, followUpNote, attachmentNotes } = validation.data;

    const updatedAction = await prisma.$transaction(async (tx) => {
      const act = await tx.actionTaken.update({
        where: { id: actionId },
        data: {
          ...(actionDateTime ? { actionDateTime } : {}),
          ...(description ? { description } : {}),
          ...(result ? { result } : {}),
          followUpRequired,
          followUpNote,
          attachmentNotes,
          version: existingAction.version + 1,
          updatedById: currentUser.id,
          updatedAt: new Date(),
        },
        include: {
          performedBy: { select: { id: true, name: true, email: true, role: true } },
          updatedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // BR-13: Updates parent Ticket.updatedAt
      await tx.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      return act;
    });

    res.status(200).json(updatedAction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to update action taken" } });
  }
}
