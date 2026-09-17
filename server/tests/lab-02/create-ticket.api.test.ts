import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REQUESTER = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };

async function loginAgent() {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(REQUESTER);
  return agent;
}

const VALID_TICKET = {
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Laptop battery drains quickly",
  description: "Battery drains much faster than usual even when the system is idle.",
  requestedPriority: "MEDIUM",
};

describe("POST /api/tickets", () => {
  it("creates a ticket with valid data and returns a generated ticket number", async () => {
    const agent = await loginAgent();
    const res = await agent.post("/api/tickets").send(VALID_TICKET);

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
  });

  it("rejects a request with no authenticated session", async () => {
    const res = await request(app).post("/api/tickets").send(VALID_TICKET);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a request with a summary that is too short", async () => {
    const agent = await loginAgent();
    const res = await agent.post("/api/tickets").send({ ...VALID_TICKET, summary: "Hi" });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.summary).toBeDefined();
  });

  it("rejects a request with a missing description", async () => {
    const agent = await loginAgent();
    const res = await agent.post("/api/tickets").send({ ...VALID_TICKET, description: undefined });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.description).toBeDefined();
  });

  it("rejects an invalid requestedPriority value", async () => {
    const agent = await loginAgent();
    const res = await agent.post("/api/tickets").send({ ...VALID_TICKET, requestedPriority: "URGENT" });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.requestedPriority).toBeDefined();
  });

  it("rejects an unknown categoryId", async () => {
    const agent = await loginAgent();
    const res = await agent.post("/api/tickets").send({ ...VALID_TICKET, categoryId: 9999 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNKNOWN_REFERENCE");
  });

  it("rejects an unknown relatedSystemId", async () => {
    const agent = await loginAgent();
    const res = await agent.post("/api/tickets").send({ ...VALID_TICKET, relatedSystemId: 9999 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNKNOWN_REFERENCE");
  });
});