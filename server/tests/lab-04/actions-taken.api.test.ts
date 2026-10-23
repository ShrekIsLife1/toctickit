import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { validateActionInput } from "../../src/actionsTaken.js";

const REQUESTER_JENNIFER = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };
const REQUESTER_DAVID = { email: "david.lee@example.com", password: "ChangeMe123!" };
const STAFF_KEVIN = { email: "kevin.patel@example.com", password: "ChangeMe123!" };
const STAFF_LISA = { email: "lisa.martinez@example.com", password: "ChangeMe123!" };
const ADMIN = { email: "admin@example.com", password: "ChangeMe123!" };

async function loginAgent(creds: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(creds);
  return agent;
}

async function createTestTicket(agent: ReturnType<typeof request.agent>, summary = "Action test ticket") {
  const res = await agent.post("/api/tickets").send({
    categoryId: 1,
    relatedSystemId: 1,
    summary,
    description: "Ticket created to test Actions Taken workflow.",
    requestedPriority: "MEDIUM",
  });
  return res.body;
}

describe("Unit: Action Taken Validation (UNIT-03)", () => {
  it("rejects future action date/time greater than 5 minutes", () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const result = validateActionInput({
      actionDateTime: futureDate,
      description: "Did some work",
      result: "All good",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Action date/time cannot be more than 5 minutes in the future.");
  });

  it("accepts action date/time within 5 minutes or in the past", () => {
    const validFuture = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const result = validateActionInput({
      actionDateTime: validFuture,
      description: "Valid action",
      result: "Passed",
    });
    expect(result.isValid).toBe(true);
  });

  it("enforces mandatory follow-up note when followUpRequired is true", () => {
    const resultNoNote = validateActionInput({
      description: "Cable replaced",
      result: "Working",
      followUpRequired: true,
      followUpNote: "   ",
    });
    expect(resultNoNote.isValid).toBe(false);
    expect(resultNoNote.errors).toContain("Follow-up note is required when follow-up is requested.");

    const resultWithNote = validateActionInput({
      description: "Cable replaced",
      result: "Working",
      followUpRequired: true,
      followUpNote: "Check tomorrow morning.",
    });
    expect(resultWithNote.isValid).toBe(true);
    expect(resultWithNote.data.followUpNote).toBe("Check tomorrow morning.");
  });

  it("enforces character limits on description (2000), result (1000) and attachment notes (500)", () => {
    const longDesc = "a".repeat(2001);
    const longRes = "b".repeat(1001);
    const longAttach = "c".repeat(501);

    const result = validateActionInput({
      description: longDesc,
      result: longRes,
      attachmentNotes: longAttach,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Action description cannot exceed 2000 characters.");
    expect(result.errors).toContain("Result cannot exceed 1000 characters.");
    expect(result.errors).toContain("Attachment notes cannot exceed 500 characters.");
  });
});

describe("API: Actions Taken (Sprint 4)", () => {
  let jenniferAgent: ReturnType<typeof request.agent>;
  let davidAgent: ReturnType<typeof request.agent>;
  let kevinAgent: ReturnType<typeof request.agent>;
  let lisaAgent: ReturnType<typeof request.agent>;
  let adminAgent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    jenniferAgent = await loginAgent(REQUESTER_JENNIFER);
    davidAgent = await loginAgent(REQUESTER_DAVID);
    kevinAgent = await loginAgent(STAFF_KEVIN);
    lisaAgent = await loginAgent(STAFF_LISA);
    adminAgent = await loginAgent(ADMIN);
  });

  it("API-01 / AC-01: Creates an Action Taken with authenticated user as performedBy and updates ticket updatedAt", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for API-01");
    const initialUpdatedAt = ticket.updatedAt;

    // Small delay to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await kevinAgent
      .post(`/api/tickets/${ticket.id}/actions-taken`)
      .send({
        description: "Replaced faulty power brick.",
        result: "Laptop boots and charges normally.",
        followUpRequired: false,
        attachmentNotes: "receipt_123.pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.ticketId).toBe(ticket.id);
    expect(res.body.description).toBe("Replaced faulty power brick.");
    expect(res.body.result).toBe("Laptop boots and charges normally.");
    expect(res.body.performedBy.email).toBe(STAFF_KEVIN.email);
    expect(res.body.version).toBe(1);

    // Verify parent ticket updatedAt was bumped
    const prisma = getPrisma();
    const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(new Date(updatedTicket!.updatedAt).getTime()).toBeGreaterThan(new Date(initialUpdatedAt).getTime());
  });

  it("API-02 / AC-03: Non-owner IT Staff member creates an action without altering the ticket owner", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for AC-03 non-owner");

    // Assign ticket to Kevin first
    const prisma = getPrisma();
    const kevinUser = await prisma.user.findUnique({ where: { email: STAFF_KEVIN.email } });
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { ticketOwnerId: kevinUser!.id },
    });

    // Lisa (different staff member) creates an action
    const res = await lisaAgent
      .post(`/api/tickets/${ticket.id}/actions-taken`)
      .send({
        description: "Checked network card driver compatibility.",
        result: "Updated driver to latest OEM version.",
      });

    expect(res.status).toBe(201);
    expect(res.body.performedBy.email).toBe(STAFF_LISA.email);

    // Verify Ticket Owner is still Kevin
    const currentTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(currentTicket!.ticketOwnerId).toBe(kevinUser!.id);
  });

  it("API-03 / AC-04: Rejects action creation with 400 when followUpRequired is true but followUpNote is missing", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for AC-04");

    const res = await kevinAgent
      .post(`/api/tickets/${ticket.id}/actions-taken`)
      .send({
        description: "Replaced screen hinge.",
        result: "Hinge is tight.",
        followUpRequired: true,
        followUpNote: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("API-04 / AC-05: Requesters are forbidden from creating or editing Actions Taken (403)", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for AC-05");

    // Requester tries to POST
    const postRes = await jenniferAgent
      .post(`/api/tickets/${ticket.id}/actions-taken`)
      .send({
        description: "Requester trying to write an action",
        result: "Should fail",
      });

    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe("FORBIDDEN");

    // Staff creates an action first
    const createRes = await kevinAgent
      .post(`/api/tickets/${ticket.id}/actions-taken`)
      .send({
        description: "Staff created action",
        result: "Success",
      });
    const actionId = createRes.body.id;

    // Requester tries to PATCH
    const patchRes = await jenniferAgent
      .patch(`/api/tickets/${ticket.id}/actions-taken/${actionId}`)
      .send({
        expectedVersion: 1,
        description: "Requester trying to edit",
      });

    expect(patchRes.status).toBe(403);
    expect(patchRes.body.error.code).toBe("FORBIDDEN");
  });

  it("API-05 / AC-06: Requester views actions for owned ticket (200); returns 404 for another requester's ticket", async () => {
    const jenniferTicket = await createTestTicket(jenniferAgent, "Jennifer's ticket");

    // Staff creates two actions with distinct times
    await kevinAgent.post(`/api/tickets/${jenniferTicket.id}/actions-taken`).send({
      actionDateTime: new Date("2026-10-23T10:00:00Z").toISOString(),
      description: "First inspection",
      result: "Identified issue",
    });
    await lisaAgent.post(`/api/tickets/${jenniferTicket.id}/actions-taken`).send({
      actionDateTime: new Date("2026-10-23T11:00:00Z").toISOString(),
      description: "Second inspection",
      result: "Applied fix",
    });

    // Jennifer reads actions of her own ticket -> 200 with 2 items in chronological order
    const jenRes = await jenniferAgent.get(`/api/tickets/${jenniferTicket.id}/actions-taken`);
    expect(jenRes.status).toBe(200);
    expect(jenRes.body.length).toBe(2);
    expect(jenRes.body[0].description).toBe("First inspection");
    expect(jenRes.body[1].description).toBe("Second inspection");

    // David (another requester) tries to access Jennifer's ticket actions -> 404
    const davidRes = await davidAgent.get(`/api/tickets/${jenniferTicket.id}/actions-taken`);
    expect(davidRes.status).toBe(404);
    expect(davidRes.body.error.code).toBe("NOT_FOUND");
  });

  it("API-06 / AC-07: Optimistic concurrency rejection with 409 STALE_UPDATE on conflicting edits", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for AC-07 concurrency");

    const createdRes = await kevinAgent.post(`/api/tickets/${ticket.id}/actions-taken`).send({
      description: "Initial action description",
      result: "Initial result",
    });
    const actionId = createdRes.body.id;
    expect(createdRes.body.version).toBe(1);

    // Kevin updates action successfully with expectedVersion = 1
    const firstUpdate = await kevinAgent
      .patch(`/api/tickets/${ticket.id}/actions-taken/${actionId}`)
      .send({
        expectedVersion: 1,
        description: "Kevin's updated description",
      });
    expect(firstUpdate.status).toBe(200);
    expect(firstUpdate.body.version).toBe(2);
    expect(firstUpdate.body.updatedBy.email).toBe(STAFF_KEVIN.email);

    // Lisa attempts update using stale expectedVersion = 1 -> 409 STALE_UPDATE
    const staleUpdate = await lisaAgent
      .patch(`/api/tickets/${ticket.id}/actions-taken/${actionId}`)
      .send({
        expectedVersion: 1,
        description: "Lisa's conflicting description",
      });
    expect(staleUpdate.status).toBe(409);
    expect(staleUpdate.body.error.code).toBe("STALE_UPDATE");
    expect(staleUpdate.body.error.details.currentVersion).toBe(2);

    // Lisa reloads and updates with expectedVersion = 2 -> 200 OK
    const successfulRetry = await lisaAgent
      .patch(`/api/tickets/${ticket.id}/actions-taken/${actionId}`)
      .send({
        expectedVersion: 2,
        description: "Lisa's merged description",
      });
    expect(successfulRetry.status).toBe(200);
    expect(successfulRetry.body.version).toBe(3);
    expect(successfulRetry.body.updatedBy.email).toBe(STAFF_LISA.email);
  });

  it("API-07 / AC-12: Prevents adding or editing Actions Taken on a Cancelled ticket (409)", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for Cancelled check");

    // Add one action while ticket is still active
    const actionRes = await kevinAgent.post(`/api/tickets/${ticket.id}/actions-taken`).send({
      description: "Action before cancel",
      result: "Done",
    });
    const actionId = actionRes.body.id;

    // Set ticket status to CANCELLED in DB
    const prisma = getPrisma();
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: "CANCELLED" },
    });

    // Attempt to create new action on CANCELLED ticket
    const postRes = await kevinAgent.post(`/api/tickets/${ticket.id}/actions-taken`).send({
      description: "Should fail on cancelled",
      result: "Failed",
    });
    expect(postRes.status).toBe(409);
    expect(postRes.body.error.code).toBe("CANCELLED_TICKET_IMMUTABLE");

    // Attempt to edit action on CANCELLED ticket
    const patchRes = await kevinAgent
      .patch(`/api/tickets/${ticket.id}/actions-taken/${actionId}`)
      .send({
        expectedVersion: 1,
        description: "Should also fail",
      });
    expect(patchRes.status).toBe(409);
    expect(patchRes.body.error.code).toBe("CANCELLED_TICKET_IMMUTABLE");
  });

  it("API-08 / AC-19: Duplicate submissions with Idempotency-Key return cached record without duplicate DB rows", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for Idempotency check");
    const idempotencyKey = `idem-key-${Date.now()}`;

    // First request
    const firstRes = await kevinAgent
      .post(`/api/tickets/${ticket.id}/actions-taken`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        description: "Action with idempotency key",
        result: "Success",
      });
    expect(firstRes.status).toBe(201);
    const createdId = firstRes.body.id;

    // Second request with identical key
    const secondRes = await kevinAgent
      .post(`/api/tickets/${ticket.id}/actions-taken`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        description: "Action with idempotency key",
        result: "Success",
      });
    expect([200, 201]).toContain(secondRes.status);
    expect(secondRes.body.id).toBe(createdId);

    // Check database has exactly 1 action
    const prisma = getPrisma();
    const count = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
    expect(count).toBe(1);
  });
});
