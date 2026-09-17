import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { formatTicketNumber } from "./ticketNumber.js";
import { validateCreateTicket } from "./validation/ticketValidation.js";
import { parsePagination, parseSort } from "./queryParsing.js";
import { upload } from "./upload.js";
import path from "path";
import session from "express-session";
import { hashPassword, verifyPassword, requireAuth } from "./auth.js";
import { isValidTransition } from "./statusTransitions.js";

export const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-only-secret-change-in-real-deployment",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  })
);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().user.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to retrieve requesters" } });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to retrieve related systems" } });
  }
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to retrieve categories" });
  }
});

// ---------------------------------------------------------------------------
// Tickets (authenticated Requester)
// ---------------------------------------------------------------------------
app.post("/api/tickets", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number } }).currentUser;
  const requesterId = currentUser.id;

  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

  const validation = validateCreateTicket({ categoryId, relatedSystemId, summary, description, requestedPriority });
  if (!validation.valid) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "One or more fields are invalid", fields: validation.fields },
    });
  }

  try {
    const prisma = getPrisma();

    const [category, relatedSystem] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.relatedSystem.findFirst({ where: { id: relatedSystemId, isActive: true } }),
    ]);

    if (!category) {
      return res.status(400).json({
        error: { code: "UNKNOWN_REFERENCE", message: "Selected category does not exist" },
      });
    }
    if (!relatedSystem) {
      return res.status(400).json({
        error: { code: "UNKNOWN_REFERENCE", message: "Selected related system does not exist" },
      });
    }

    const year = new Date().getFullYear();
    const MAX_RETRIES = 5;
    let ticket;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        ticket = await prisma.$transaction(async (tx) => {
          const countThisYear = await tx.ticket.count({
            where: { ticketNumber: { startsWith: `TKT-${year}-` } },
          });
          const ticketNumber = formatTicketNumber(countThisYear + 1 + attempt, year);

          return tx.ticket.create({
            data: {
              ticketNumber,
              requesterId,
              categoryId,
              relatedSystemId,
              summary: summary.trim(),
              description: description.trim(),
              requestedPriority,
            },
          });
        });
        break;
      } catch (err) {
        lastError = err;
        const isUniqueConstraintError =
          typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
        if (!isUniqueConstraintError) throw err;
      }
    }

    if (!ticket) {
      throw lastError;
    }

    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to create ticket" } });
  }
});

app.get("/api/tickets", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number } }).currentUser;
  const requesterId = currentUser.id;

  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const { sortBy, sortDir } = parseSort(req.query as Record<string, unknown>);

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const requestedPriority =
    typeof req.query.requestedPriority === "string" ? req.query.requestedPriority : undefined;
  const currentStatus =
    typeof req.query.currentStatus === "string" ? req.query.currentStatus : undefined;

  const where: Record<string, unknown> = { requesterId };

  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryId && Number.isInteger(categoryId)) {
    where.categoryId = categoryId;
  }
  if (requestedPriority) {
    where.requestedPriority = requestedPriority;
  }
  if (currentStatus) {
    where.currentStatus = currentStatus;
  }

  try {
    const prisma = getPrisma();

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          categoryId: true,
          requestedPriority: true,
          currentStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    res.status(200).json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to retrieve tickets" } });
  }
});

app.get("/api/tickets/:id", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number } }).currentUser;
  const requesterId = currentUser.id;
  const ticketId = Number(req.params.id);

  if (!Number.isInteger(ticketId)) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  }

  try {
    const ticket = await getPrisma().ticket.findFirst({
      where: { id: ticketId, requesterId },
    });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    res.status(200).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to retrieve ticket" } });
  }
});

// ---------------------------------------------------------------------------
// Public Comments / Internal Notes (Issue 14)
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/comments", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
  const ticketId = Number(req.params.id);
  const { content, visibility } = req.body;

  if (typeof content !== "string" || content.trim().length === 0 || content.length > 2000) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Content must be 1-2000 characters" },
    });
  }
  if (!["PUBLIC", "INTERNAL"].includes(visibility)) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid visibility" } });
  }
  if (currentUser.role === "REQUESTER" && visibility === "INTERNAL") {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not permitted" } });
  }

  try {
    const prisma = getPrisma();

    const ticket =
      currentUser.role === "REQUESTER"
        ? await prisma.ticket.findFirst({ where: { id: ticketId, requesterId: currentUser.id } })
        : await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    const comment = await prisma.comment.create({
      data: { ticketId, authorId: currentUser.id, content: content.trim(), visibility },
      include: { author: { select: { name: true, role: true } } },
    });

    res.status(201).json({
      id: comment.id,
      ticketId: comment.ticketId,
      authorId: comment.authorId,
      authorName: comment.author.name,
      authorRole: comment.author.role,
      content: comment.content,
      visibility: comment.visibility,
      createdAt: comment.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to post comment" } });
  }
});

app.get("/api/tickets/:id/comments", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
  const ticketId = Number(req.params.id);

  try {
    const prisma = getPrisma();

    const ticket =
      currentUser.role === "REQUESTER"
        ? await prisma.ticket.findFirst({ where: { id: ticketId, requesterId: currentUser.id } })
        : await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    const comments = await prisma.comment.findMany({
      where: {
        ticketId,
        ...(currentUser.role === "REQUESTER" ? { visibility: "PUBLIC" } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true, role: true } } },
    });

    res.status(200).json(
      comments.map((c) => ({
        id: c.id,
        ticketId: c.ticketId,
        authorId: c.authorId,
        authorName: c.author.name,
        authorRole: c.author.role,
        content: c.content,
        visibility: c.visibility,
        createdAt: c.createdAt,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to retrieve comments" } });
  }
});

app.post("/api/tickets/:id/resolve-indication", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
  const ticketId = Number(req.params.id);

  if (currentUser.role !== "REQUESTER") {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not permitted" } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId: currentUser.id } });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }
    if (ticket.problemAppearsResolved) {
      return res.status(409).json({
        error: { code: "ALREADY_RESOLVED_INDICATED", message: "Already marked as resolved" },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { problemAppearsResolved: true },
    });

    res.status(200).json({ id: updated.id, problemAppearsResolved: updated.problemAppearsResolved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to update ticket" } });
  }
});

// ---------------------------------------------------------------------------
// Attachments (authenticated Requester)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/attachments",
  requireAuth,
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof Error && err.message === "UNSUPPORTED_TYPE") {
          return res.status(400).json({
            error: { code: "UNSUPPORTED_TYPE", message: "File type not allowed" },
          });
        }
        if ((err as { code?: string }).code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            error: { code: "FILE_TOO_LARGE", message: "File exceeds the 5 MB limit" },
          });
        }
        console.error(err);
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Upload failed" } });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const currentUser = (req as Request & { currentUser: { id: number } }).currentUser;
    const requesterId = currentUser.id;
    const ticketId = Number(req.params.id);
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "A file is required" },
      });
    }

    try {
      const prisma = getPrisma();

      const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId } });
      if (!ticket) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
      }

      const activeCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });
      if (activeCount >= 5) {
        return res.status(409).json({
          error: { code: "ATTACHMENT_LIMIT_REACHED", message: "This ticket already has 5 active attachments" },
        });
      }

      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          originalFilename: file.originalname,
          storedFilename: file.filename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });

      res.status(201).json(attachment);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to save attachment" } });
    }
  }
);

app.get("/api/tickets/:id/attachments", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
  const ticketId = Number(req.params.id);

  try {
    const prisma = getPrisma();

    const ticket =
      currentUser.role === "REQUESTER"
        ? await prisma.ticket.findFirst({ where: { id: ticketId, requesterId: currentUser.id } })
        : await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    const attachments = await prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { uploadedAt: "asc" },
    });

    res.status(200).json(attachments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to retrieve attachments" } });
  }
});

app.get("/api/attachments/:id/download", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number } }).currentUser;
  const requesterId = currentUser.id;
  const attachmentId = Number(req.params.id);

  try {
    const prisma = getPrisma();
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        isRemoved: false,
        ticket: { requesterId },
      },
    });

    if (!attachment) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment not found" } });
    }

    const filePath = path.join(process.cwd(), "uploads", attachment.storedFilename);
    res.download(filePath, attachment.originalFilename);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to download attachment" } });
  }
});

app.delete("/api/attachments/:id", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number } }).currentUser;
  const requesterId = currentUser.id;
  const attachmentId = Number(req.params.id);
  const { reason } = req.body;

  if (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 200) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "A removal reason (3-200 characters) is required" },
    });
  }

  try {
    const prisma = getPrisma();
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        isRemoved: false,
        ticket: { requesterId },
      },
    });

    if (!attachment) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment not found" } });
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: { isRemoved: true, removedAt: new Date(), removalReason: reason.trim() },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to remove attachment" } });
  }
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required" } });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    });

    const genericError = () =>
      res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });

    if (!user) return genericError();

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return genericError();

    req.session.userId = user.id;

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to log in" } });
  }
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to log out" } });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ success: true });
  });
});

app.get("/api/auth/me", requireAuth, (req: Request, res: Response) => {
  const user = (req as Request & { currentUser: { id: number; name: string; email: string; role: string; mustChangePassword: boolean } }).currentUser;
  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
});

app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
  const user = (req as Request & { currentUser: { id: number; passwordHash: string } }).currentUser;
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Both passwords are required" } });
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(400).json({ error: { code: "INVALID_CURRENT_PASSWORD", message: "Current password is incorrect" } });
  }

  const strong =
    newPassword.length >= 8 &&
    /[a-z]/.test(newPassword) &&
    /[A-Z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[^a-zA-Z0-9]/.test(newPassword);

  if (!strong) {
    return res.status(400).json({
      error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters with upper/lower case, a number, and a special character" },
    });
  }

  try {
    const newHash = await hashPassword(newPassword);
    await getPrisma().user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to change password" } });
  }
});

app.get("/api/staff/tickets", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { role: string } }).currentUser;

  if (!["IT_STAFF", "ADMINISTRATOR"].includes(currentUser.role)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not permitted" } });
  }

  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const { sortBy, sortDir } = parseSort(req.query as Record<string, unknown>);

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const requestedPriority =
    typeof req.query.requestedPriority === "string" ? req.query.requestedPriority : undefined;
  const itPriority = typeof req.query.itPriority === "string" ? req.query.itPriority : undefined;
  const currentStatus =
    typeof req.query.currentStatus === "string" ? req.query.currentStatus : undefined;
  const ticketOwnerIdRaw = req.query.ticketOwnerId;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryId && Number.isInteger(categoryId)) where.categoryId = categoryId;
  if (requestedPriority) where.requestedPriority = requestedPriority;
  if (itPriority) where.itPriority = itPriority;
  if (currentStatus) where.currentStatus = currentStatus;
  if (ticketOwnerIdRaw === "unassigned") {
    where.ticketOwnerId = null;
  } else if (ticketOwnerIdRaw && Number.isInteger(Number(ticketOwnerIdRaw))) {
    where.ticketOwnerId = Number(ticketOwnerIdRaw);
  }

  try {
    const prisma = getPrisma();

    const [rows, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          categoryId: true,
          requestedPriority: true,
          itPriority: true,
          currentStatus: true,
          createdAt: true,
          updatedAt: true,
          ticketOwnerId: true,
          ticketOwner: { select: { name: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      ticketNumber: r.ticketNumber,
      summary: r.summary,
      categoryId: r.categoryId,
      requestedPriority: r.requestedPriority,
      itPriority: r.itPriority,
      currentStatus: r.currentStatus,
      ticketOwnerId: r.ticketOwnerId,
      ticketOwnerName: r.ticketOwner?.name ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.status(200).json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to retrieve tickets" } });
  }
});

app.post("/api/staff/tickets/:id/claim", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
  const ticketId = Number(req.params.id);
  const { ticketOwnerId } = req.body;

  if (!["IT_STAFF", "ADMINISTRATOR"].includes(currentUser.role)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not permitted" } });
  }

  try {
    const prisma = getPrisma();

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    const owner = await prisma.user.findFirst({
      where: { id: ticketOwnerId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } },
    });
    if (!owner) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "ticketOwnerId must reference an active IT Staff or Administrator" },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { ticketOwnerId: owner.id },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to claim ticket" } });
  }
});

app.get("/api/staff/tickets/:id", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { role: string } }).currentUser;
  const ticketId = Number(req.params.id);

  if (!["IT_STAFF", "ADMINISTRATOR"].includes(currentUser.role)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not permitted" } });
  }
  if (!Number.isInteger(ticketId)) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  }

  try {
    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: { ticketOwner: { select: { name: true } }, requester: { select: { name: true } } },
    });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    res.status(200).json({
      ...ticket,
      ticketOwnerName: ticket.ticketOwner?.name ?? null,
      requesterName: ticket.requester?.name ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to retrieve ticket" } });
  }
});
app.patch("/api/staff/tickets/:id", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as Request & { currentUser: { role: string } }).currentUser;
  const ticketId = Number(req.params.id);
  const { itPriority, currentStatus } = req.body;

  if (!["IT_STAFF", "ADMINISTRATOR"].includes(currentUser.role)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not permitted" } });
  }

  if (itPriority !== undefined && !["LOW", "MEDIUM", "HIGH"].includes(itPriority)) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid itPriority" } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    if (currentStatus !== undefined) {
      if (!isValidTransition(ticket.currentStatus, currentStatus)) {
        return res.status(409).json({
          error: { code: "INVALID_STATUS_TRANSITION", message: `Cannot move from ${ticket.currentStatus} to ${currentStatus}` },
        });
      }
    }

    const data: Record<string, unknown> = {};
    if (itPriority !== undefined) data.itPriority = itPriority;
    if (currentStatus !== undefined) data.currentStatus = currentStatus;

    const updated = await prisma.ticket.update({ where: { id: ticketId }, data });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to update ticket" } });
  }
});
export default app;