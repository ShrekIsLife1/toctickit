import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REQUESTER_A = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };
const REQUESTER_B = { email: "michael.brown@example.com", password: "ChangeMe123!" };
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
    summary: "Default summary for test ticket",
    description: "Default description long enough to pass validation rules.",
    requestedPriority: "MEDIUM",
    ...overrides,
  });
  return res.body;
}

describe("GET /api/tickets", () => {
  let agentA: ReturnType<typeof request.agent>;
  let ticketA1: { ticketNumber: string };

  beforeAll(async () => {
    agentA = await loginAgent(REQUESTER_A);
    const agentB = await loginAgent(REQUESTER_B);

    ticketA1 = await createTicket(agentA, { summary: `Laptop battery drains quickly ${RUN_ID}` });
    await createTicket(agentA, { summary: `VPN connection keeps dropping ${RUN_ID}`, requestedPriority: "HIGH" });
    await createTicket(agentB, { summary: `Requester B's own ticket ${RUN_ID}` });
  });

  it("returns only tickets belonging to the authenticated requester", async () => {
    const res = await agentA.get("/api/tickets");

    expect(res.status).toBe(200);
    const summaries = res.body.data.map((t: { summary: string }) => t.summary);
    expect(summaries).toContain(`Laptop battery drains quickly ${RUN_ID}`);
    expect(summaries).toContain(`VPN connection keeps dropping ${RUN_ID}`);
    expect(summaries).not.toContain(`Requester B's own ticket ${RUN_ID}`);
  });

  it("filters by search matching the summary", async () => {
    const res = await agentA.get(`/api/tickets?search=VPN connection keeps dropping ${RUN_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].summary).toBe(`VPN connection keeps dropping ${RUN_ID}`);
  });

  it("filters by search matching the ticket number", async () => {
    const res = await agentA.get(`/api/tickets?search=${ticketA1.ticketNumber}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].ticketNumber).toBe(ticketA1.ticketNumber);
  });

  it("filters by requestedPriority", async () => {
    const res = await agentA.get("/api/tickets?requestedPriority=HIGH");

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { requestedPriority: string }) => t.requestedPriority === "HIGH")).toBe(true);
  });

  it("returns an empty data array with total 0 when filters match nothing", async () => {
    const res = await agentA.get("/api/tickets?search=nonexistent-xyz-123");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it("respects pagination metadata", async () => {
    const res = await agentA.get("/api/tickets?pageSize=1&page=1");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.pageSize).toBe(1);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  it("rejects a request with no authenticated session", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});