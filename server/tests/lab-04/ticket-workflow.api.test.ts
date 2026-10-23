import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { isValidTransition, getPermittedTransitions } from "../../src/statusTransitions.js";
import { validateResolutionGate } from "../../src/resolutionGate.js";

const REQUESTER_JENNIFER = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };
const STAFF_KEVIN = { email: "kevin.patel@example.com", password: "ChangeMe123!" };

async function loginAgent(creds: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(creds);
  return agent;
}

async function createTestTicket(agent: ReturnType<typeof request.agent>, summary = "Workflow test ticket") {
  const res = await agent.post("/api/tickets").send({
    categoryId: 1,
    relatedSystemId: 1,
    summary,
    description: "Ticket created to test lifecycle status transitions.",
    requestedPriority: "MEDIUM",
  });
  return res.body;
}

describe("Unit: Status Transitions & Resolution Gate (UNIT-01, UNIT-02)", () => {
  it("UNIT-01: Validates permitted transition matrix correctly", () => {
    // Permitted pairs
    expect(isValidTransition("NEW", "OPEN")).toBe(true);
    expect(isValidTransition("OPEN", "IN_PROGRESS")).toBe(true);
    expect(isValidTransition("OPEN", "CANCELLED")).toBe(true);
    expect(isValidTransition("IN_PROGRESS", "WAITING_FOR_REQUESTER")).toBe(true);
    expect(isValidTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(isValidTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
    expect(isValidTransition("WAITING_FOR_REQUESTER", "IN_PROGRESS")).toBe(true);
    expect(isValidTransition("WAITING_FOR_REQUESTER", "CANCELLED")).toBe(true);
    expect(isValidTransition("RESOLVED", "CLOSED")).toBe(true);
    expect(isValidTransition("RESOLVED", "REOPENED")).toBe(true);
    expect(isValidTransition("CLOSED", "REOPENED")).toBe(true);
    expect(isValidTransition("REOPENED", "IN_PROGRESS")).toBe(true);

    // Disallowed transitions
    expect(isValidTransition("NEW", "CLOSED")).toBe(false);
    expect(isValidTransition("NEW", "RESOLVED")).toBe(false);
    expect(isValidTransition("IN_PROGRESS", "CLOSED")).toBe(false);
    expect(isValidTransition("CANCELLED", "OPEN")).toBe(false);
    expect(isValidTransition("CANCELLED", "REOPENED")).toBe(false);
    expect(isValidTransition("OPEN", "OPEN")).toBe(false);
  });

  it("UNIT-02: Validates resolution gate conditions correctly", () => {
    // Missing both
    const missingBoth = validateResolutionGate({ ticketOwnerId: null, actionsCount: 0 });
    expect(missingBoth.isMet).toBe(false);
    expect(missingBoth.missingCriteria).toHaveLength(2);

    // Missing owner only
    const missingOwner = validateResolutionGate({ ticketOwnerId: null, actionsCount: 2 });
    expect(missingOwner.isMet).toBe(false);
    expect(missingOwner.missingCriteria).toEqual(["Ticket must have an assigned owner"]);

    // Missing actions only
    const missingActions = validateResolutionGate({ ticketOwnerId: 5, actionsCount: 0 });
    expect(missingActions.isMet).toBe(false);
    expect(missingActions.missingCriteria).toEqual(["Ticket must have at least one Action Taken recorded"]);

    // Both satisfied
    const gateSatisfied = validateResolutionGate({ ticketOwnerId: 5, actionsCount: 1 });
    expect(gateSatisfied.isMet).toBe(true);
    expect(gateSatisfied.missingCriteria).toHaveLength(0);
  });
});

describe("API: Ticket Workflow and Resolution Gate (Sprint 4)", () => {
  let jenniferAgent: ReturnType<typeof request.agent>;
  let kevinAgent: ReturnType<typeof request.agent>;
  let kevinUserId: number;

  beforeEach(async () => {
    jenniferAgent = await loginAgent(REQUESTER_JENNIFER);
    kevinAgent = await loginAgent(STAFF_KEVIN);

    const prisma = getPrisma();
    const kevinUser = await prisma.user.findUnique({ where: { email: STAFF_KEVIN.email } });
    kevinUserId = kevinUser!.id;
  });

  it("API-09 / AC-08: Resolution gate blocks In Progress -> Resolved when owner or actions are missing (409)", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for Resolution Gate rejection");
    const prisma = getPrisma();

    // Advance ticket to IN_PROGRESS without owner and with 0 actions
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: "IN_PROGRESS", ticketOwnerId: null },
    });

    // Staff attempts to move to RESOLVED -> 409 RESOLUTION_GATE_NOT_MET
    const res = await kevinAgent
      .patch(`/api/staff/tickets/${ticket.id}`)
      .send({ currentStatus: "RESOLVED" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
    expect(res.body.error.details).toContain("Ticket must have an assigned owner");
    expect(res.body.error.details).toContain("Ticket must have at least one Action Taken recorded");

    // Assign owner but still 0 actions -> still fails with 1 item
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { ticketOwnerId: kevinUserId },
    });

    const resNoActions = await kevinAgent
      .patch(`/api/staff/tickets/${ticket.id}`)
      .send({ currentStatus: "RESOLVED" });

    expect(resNoActions.status).toBe(409);
    expect(resNoActions.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
    expect(resNoActions.body.error.details).toEqual(["Ticket must have at least one Action Taken recorded"]);
  });

  it("API-10 / AC-09: Resolution gate succeeds when owner exists and >=1 Action Taken is recorded", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for Resolution Gate success");
    const prisma = getPrisma();

    // Set to IN_PROGRESS and assigned to Kevin
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: "IN_PROGRESS", ticketOwnerId: kevinUserId },
    });

    // Add an Action Taken
    await kevinAgent.post(`/api/tickets/${ticket.id}/actions-taken`).send({
      description: "Fixed root cause in server config.",
      result: "Services restored.",
    });

    // Advance to RESOLVED
    const res = await kevinAgent
      .patch(`/api/staff/tickets/${ticket.id}`)
      .send({ currentStatus: "RESOLVED" });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("RESOLVED");
    expect(res.body.statusChangedAt).toBeDefined();
    expect(res.body.version).toBeGreaterThan(1);
  });

  it("API-11 / AC-10: Rejects invalid status transitions with 409 INVALID_STATUS_TRANSITION", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for invalid transition check");

    // Ticket starts at NEW, attempt jump to CLOSED directly
    const res = await kevinAgent
      .patch(`/api/staff/tickets/${ticket.id}`)
      .send({ currentStatus: "CLOSED" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");

    // Set ticket to CANCELLED in DB
    const prisma = getPrisma();
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: "CANCELLED" },
    });

    // Attempt transition out of CANCELLED -> 409
    const cancelRes = await kevinAgent
      .patch(`/api/staff/tickets/${ticket.id}`)
      .send({ currentStatus: "OPEN" });

    expect(cancelRes.status).toBe(409);
    expect(cancelRes.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("API-12 / AC-11: Requester resolve-indication is advisory only and doesn't satisfy resolution gate", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for Requester resolve indication");
    const prisma = getPrisma();

    // Move ticket to OPEN so indication is permitted
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: "OPEN", ticketOwnerId: null },
    });

    // Requester indicates problem appears resolved
    const indRes = await jenniferAgent.post(`/api/tickets/${ticket.id}/resolve-indication`);
    expect(indRes.status).toBe(200);
    expect(indRes.body.problemAppearsResolved).toBe(true);

    // Verify status was NOT changed
    const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(dbTicket!.currentStatus).toBe("OPEN");

    // Repeating indication returns 409 ALREADY_RESOLVED_INDICATED
    const repeatRes = await jenniferAgent.post(`/api/tickets/${ticket.id}/resolve-indication`);
    expect(repeatRes.status).toBe(409);
    expect(repeatRes.body.error.code).toBe("ALREADY_RESOLVED_INDICATED");

    // Advance to IN_PROGRESS; staff still cannot resolve without owner + actions
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: "IN_PROGRESS" },
    });

    const resolveRes = await kevinAgent
      .patch(`/api/staff/tickets/${ticket.id}`)
      .send({ currentStatus: "RESOLVED" });

    expect(resolveRes.status).toBe(409);
    expect(resolveRes.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
  });

  it("API-13 / BR-18: Reopening a ticket resets problemAppearsResolved to false", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for Reopen reset check");
    const prisma = getPrisma();

    // Set to RESOLVED with problemAppearsResolved: true
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: "RESOLVED",
        ticketOwnerId: kevinUserId,
        problemAppearsResolved: true,
      },
    });

    // Staff reopens ticket: RESOLVED -> REOPENED
    const reopenRes = await kevinAgent
      .patch(`/api/staff/tickets/${ticket.id}`)
      .send({ currentStatus: "REOPENED" });

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.currentStatus).toBe("REOPENED");
    expect(reopenRes.body.problemAppearsResolved).toBe(false);

    // Verify in database
    const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(dbTicket!.problemAppearsResolved).toBe(false);
  });

  it("API-14 / AC-07: Concurrency control on PATCH /api/staff/tickets/:id rejects stale updates (409)", async () => {
    const ticket = await createTestTicket(jenniferAgent, "Ticket for ticket concurrency check");
    const currentVersion = ticket.version;

    // Staff update with matching version
    const firstUpdate = await kevinAgent
      .patch(`/api/staff/tickets/${ticket.id}`)
      .send({
        expectedVersion: currentVersion,
        itPriority: "HIGH",
      });

    expect(firstUpdate.status).toBe(200);
    expect(firstUpdate.body.version).toBe(currentVersion + 1);

    // Second update with old version returns 409 STALE_UPDATE
    const staleUpdate = await kevinAgent
      .patch(`/api/staff/tickets/${ticket.id}`)
      .send({
        expectedVersion: currentVersion,
        itPriority: "LOW",
      });

    expect(staleUpdate.status).toBe(409);
    expect(staleUpdate.body.error.code).toBe("STALE_UPDATE");
    expect(staleUpdate.body.error.details.currentVersion).toBe(currentVersion + 1);
  });
});
