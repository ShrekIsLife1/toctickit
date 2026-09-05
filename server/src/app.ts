import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { formatTicketNumber } from "./ticketNumber.js";
import { validateCreateTicket } from "./validation/ticketValidation.js";
import { parsePagination, parseSort } from "./queryParsing.js";
import { upload } from "./upload.js";
import path from "path";

// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});


app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
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

app.post("/api/tickets", async (req: Request, res: Response) => {
  const requesterIdHeader = req.header("X-Requester-Id");
  const requesterId = requesterIdHeader ? Number(requesterIdHeader) : NaN;

  if (!requesterIdHeader || !Number.isInteger(requesterId)) {
    return res.status(400).json({
      error: { code: "MISSING_REQUESTER", message: "A valid X-Requester-Id header is required" },
    });
  }

  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

  const validation = validateCreateTicket({ categoryId, relatedSystemId, summary, description, requestedPriority });
  if (!validation.valid) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "One or more fields are invalid", fields: validation.fields },
    });
  }

  try {
    const prisma = getPrisma();

    const [requester, category, relatedSystem] = await Promise.all([
      prisma.requesterUser.findFirst({ where: { id: requesterId, isActive: true } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.relatedSystem.findFirst({ where: { id: relatedSystemId, isActive: true } }),
    ]);

    if (!requester) {
      return res.status(400).json({
        error: { code: "MISSING_REQUESTER", message: "Selected requester is not active" },
      });
    }
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
    // otherwise loop again and retry with an incremented number
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
// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// TODO(Issue 4): implement the route here.
// ---------------------------------------------------------------------------
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

app.get("/api/tickets", async (req: Request, res: Response) => {
  const requesterIdHeader = req.header("X-Requester-Id");
  const requesterId = requesterIdHeader ? Number(requesterIdHeader) : NaN;

  if (!requesterIdHeader || !Number.isInteger(requesterId)) {
    return res.status(400).json({
      error: { code: "MISSING_REQUESTER", message: "A valid X-Requester-Id header is required" },
    });
  }

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

app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  const requesterIdHeader = req.header("X-Requester-Id");
  const requesterId = requesterIdHeader ? Number(requesterIdHeader) : NaN;
  const ticketId = Number(req.params.id);

  if (!requesterIdHeader || !Number.isInteger(requesterId)) {
    return res.status(400).json({
      error: { code: "MISSING_REQUESTER", message: "A valid X-Requester-Id header is required" },
    });
  }
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

app.post(
  "/api/tickets/:id/attachments",
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
    const requesterIdHeader = req.header("X-Requester-Id");
    const requesterId = requesterIdHeader ? Number(requesterIdHeader) : NaN;
    const ticketId = Number(req.params.id);
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!requesterIdHeader || !Number.isInteger(requesterId)) {
      return res.status(400).json({
        error: { code: "MISSING_REQUESTER", message: "A valid X-Requester-Id header is required" },
      });
    }
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

app.get("/api/tickets/:id/attachments", async (req: Request, res: Response) => {
  const requesterIdHeader = req.header("X-Requester-Id");
  const requesterId = requesterIdHeader ? Number(requesterIdHeader) : NaN;
  const ticketId = Number(req.params.id);

  if (!requesterIdHeader || !Number.isInteger(requesterId)) {
    return res.status(400).json({
      error: { code: "MISSING_REQUESTER", message: "A valid X-Requester-Id header is required" },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId } });
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

app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  const requesterIdHeader = req.header("X-Requester-Id");
  const requesterId = requesterIdHeader ? Number(requesterIdHeader) : NaN;
  const attachmentId = Number(req.params.id);

  if (!requesterIdHeader || !Number.isInteger(requesterId)) {
    return res.status(400).json({
      error: { code: "MISSING_REQUESTER", message: "A valid X-Requester-Id header is required" },
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

    const filePath = path.join(process.cwd(), "uploads", attachment.storedFilename);
    res.download(filePath, attachment.originalFilename);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to download attachment" } });
  }
});

app.delete("/api/attachments/:id", async (req: Request, res: Response) => {
  const requesterIdHeader = req.header("X-Requester-Id");
  const requesterId = requesterIdHeader ? Number(requesterIdHeader) : NaN;
  const attachmentId = Number(req.params.id);
  const { reason } = req.body;

  if (!requesterIdHeader || !Number.isInteger(requesterId)) {
    return res.status(400).json({
      error: { code: "MISSING_REQUESTER", message: "A valid X-Requester-Id header is required" },
    });
  }

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

export default app;

