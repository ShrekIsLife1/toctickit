import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REQUESTER = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };
const STAFF_A = { email: "kevin.patel@example.com", password: "ChangeMe123!" };
const STAFF_B = { email: "lisa.martinez@example.com", password: "ChangeMe123!" };
const RUN_ID = Date.now();

async function loginAgent(creds: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(creds);
  return agent;
}

async function createTicket(agent: ReturnType<typeof request.agent>, overrides: Partial<Record<string, unknown>> = {}) {
  const res = await agent.post("/api/tickets").send({
    categoryId: 1,
    relatedSystemId: 1,
    summary: `Queue test ticket ${RUN_ID}`,
    description: "Ticket created to exercise the IT Staff queue.",
    requestedPriority: "MEDIUM",
    ...overrides,
  });
  return res.body;
}

describe("IT Staff Ticket Queue", () => {
  let staffAgentA: ReturnType<typeof request.agent>;
  let staffAgentB: ReturnType<typeof request.agent>;
  let ticket: { id: number; ticketNumber: string };

  beforeAll(async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    staffAgentA = await loginAgent(STAFF_A);
    staffAgentB = await loginAgent(STAFF_B);
    ticket = await createTicket(requesterAgent, { summary: `Unique queue ticket ${RUN_ID}` });
  });

  it("rejects a Requester requesting the queue directly", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const res = await requesterAgent.get("/api/staff/tickets");
    expect(res.status).toBe(403);
  });

  it("returns tickets across all requesters, not scoped to the caller", async () => {
    const res = await staffAgentA.get(`/api/staff/tickets?search=${encodeURIComponent(`Unique queue ticket ${RUN_ID}`)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].ticketNumber).toBe(ticket.ticketNumber);
  });

  it("filters by ticketOwnerId=unassigned before any claim", async () => {
    const res = await staffAgentA.get(
      `/api/staff/tickets?ticketOwnerId=unassigned&search=${encodeURIComponent(`Unique queue ticket ${RUN_ID}`)}`
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("lets IT Staff claim an unassigned ticket", async () => {
    const meRes = await staffAgentA.get("/api/auth/me");
    const staffAId = meRes.body.id;

    const res = await staffAgentA.post(`/api/staff/tickets/${ticket.id}/claim`).send({ ticketOwnerId: staffAId });

    expect(res.status).toBe(200);
    expect(res.body.ticketOwnerId).toBe(staffAId);
  });

  it("lets a different IT Staff member reassign an already-claimed ticket", async () => {
    const meRes = await staffAgentB.get("/api/auth/me");
    const staffBId = meRes.body.id;

    const res = await staffAgentB.post(`/api/staff/tickets/${ticket.id}/claim`).send({ ticketOwnerId: staffBId });

    expect(res.status).toBe(200);
    expect(res.body.ticketOwnerId).toBe(staffBId);
  });

  it("rejects claiming to a user who is not active IT Staff or Administrator", async () => {
    const requesterMe = await (await loginAgent(REQUESTER)).get("/api/auth/me");

    const res = await staffAgentA
      .post(`/api/staff/tickets/${ticket.id}/claim`)
      .send({ ticketOwnerId: requesterMe.body.id });

    expect(res.status).toBe(400);
  });

  it("retrieves one ticket for staff operations regardless of requester ownership", async () => {
    const res = await staffAgentA.get(`/api/staff/tickets/${ticket.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticket.id);
  });

  it("rejects a Requester from retrieving a staff ticket detail directly", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const res = await requesterAgent.get(`/api/staff/tickets/${ticket.id}`);
    expect(res.status).toBe(403);
  });
});