import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REQUESTER = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };
const STAFF = { email: "kevin.patel@example.com", password: "ChangeMe123!" };
const RUN_ID = Date.now();

async function loginAgent(creds: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(creds);
  return agent;
}

async function createTicket(agent: ReturnType<typeof request.agent>) {
  const res = await agent.post("/api/tickets").send({
    categoryId: 1,
    relatedSystemId: 1,
    summary: `Staff detail test ticket ${RUN_ID}-${Math.random()}`,
    description: "Ticket created to exercise staff status/priority transitions.",
    requestedPriority: "MEDIUM",
  });
  return res.body;
}

describe("IT Staff Ticket operations", () => {
  let requesterAgent: ReturnType<typeof request.agent>;
  let staffAgent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    requesterAgent = await loginAgent(REQUESTER);
    staffAgent = await loginAgent(STAFF);
  });

  it("lets IT Staff set IT Priority independently of Requested Priority", async () => {
    const ticket = await createTicket(requesterAgent);

    const res = await staffAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ itPriority: "HIGH" });

    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe("HIGH");
    expect(res.body.requestedPriority).toBe("MEDIUM");
  });

  it("allows a valid status transition (New to Open)", async () => {
    const ticket = await createTicket(requesterAgent);

    const res = await staffAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ currentStatus: "OPEN" });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("OPEN");
  });

  it("rejects an invalid status transition (Open directly to Closed)", async () => {
    const ticket = await createTicket(requesterAgent);
    await staffAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ currentStatus: "OPEN" });

    const res = await staffAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ currentStatus: "CLOSED" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("allows the full path from New through Resolved to Closed", async () => {
    const ticket = await createTicket(requesterAgent);

    await staffAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ currentStatus: "OPEN" });
    await staffAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ currentStatus: "IN_PROGRESS" });
    const resolvedRes = await staffAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ currentStatus: "RESOLVED" });
    const closedRes = await staffAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ currentStatus: "CLOSED" });

    expect(resolvedRes.status).toBe(200);
    expect(resolvedRes.body.currentStatus).toBe("RESOLVED");
    expect(closedRes.status).toBe(200);
    expect(closedRes.body.currentStatus).toBe("CLOSED");
  });

  it("rejects an invalid itPriority value", async () => {
    const ticket = await createTicket(requesterAgent);

    const res = await staffAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ itPriority: "URGENT" });

    expect(res.status).toBe(400);
  });

  it("rejects a Requester from calling the staff PATCH endpoint", async () => {
    const ticket = await createTicket(requesterAgent);

    const res = await requesterAgent.patch(`/api/staff/tickets/${ticket.id}`).send({ itPriority: "HIGH" });

    expect(res.status).toBe(403);
  });
});