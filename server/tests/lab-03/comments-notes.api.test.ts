import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REQUESTER = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };
const STAFF = { email: "kevin.patel@example.com", password: "ChangeMe123!" };

async function loginAgent(creds: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(creds);
  return agent;
}

async function createTestTicket(agent: ReturnType<typeof request.agent>) {
  const res = await agent.post("/api/tickets").send({
    categoryId: 1,
    relatedSystemId: 1,
    summary: `Comments test ticket ${Date.now()}`,
    description: "Ticket created to exercise Public Comments and Internal Notes.",
    requestedPriority: "MEDIUM",
  });
  return res.body;
}

describe("Public Comments and Internal Notes", () => {
  it("lets a Requester post a Public Comment", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const ticket = await createTestTicket(requesterAgent);

    const res = await requesterAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "Thanks for looking into this.", visibility: "PUBLIC" });

    expect(res.status).toBe(201);
    expect(res.body.visibility).toBe("PUBLIC");
    expect(res.body.authorName).toBeDefined();
  });

  it("rejects a Requester attempting to post an Internal Note", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const ticket = await createTestTicket(requesterAgent);

    const res = await requesterAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "This should not be allowed.", visibility: "INTERNAL" });

    expect(res.status).toBe(403);
  });

  it("hides Internal Notes from the Requester's comment list", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const ticket = await createTestTicket(requesterAgent);

    const staffAgent = await loginAgent(STAFF);
    await staffAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "Internal note only staff should see.", visibility: "INTERNAL" });
    await staffAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "Public update visible to everyone.", visibility: "PUBLIC" });

    const res = await requesterAgent.get(`/api/tickets/${ticket.id}/comments`);

    expect(res.status).toBe(200);
    expect(res.body.every((c: { visibility: string }) => c.visibility === "PUBLIC")).toBe(true);
    expect(res.body.some((c: { content: string }) => c.content.includes("Internal note"))).toBe(false);
  });

  it("shows both Public Comments and Internal Notes to IT Staff", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const ticket = await createTestTicket(requesterAgent);

    const staffAgent = await loginAgent(STAFF);
    await staffAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "Staff-only note.", visibility: "INTERNAL" });

    const res = await staffAgent.get(`/api/tickets/${ticket.id}/comments`);

    expect(res.status).toBe(200);
    expect(res.body.some((c: { visibility: string }) => c.visibility === "INTERNAL")).toBe(true);
  });

  it("rejects empty or whitespace-only content", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const ticket = await createTestTicket(requesterAgent);

    const res = await requesterAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "   ", visibility: "PUBLIC" });

    expect(res.status).toBe(400);
  });

  it("rejects content longer than 2000 characters", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const ticket = await createTestTicket(requesterAgent);

    const res = await requesterAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "a".repeat(2001), visibility: "PUBLIC" });

    expect(res.status).toBe(400);
  });

  it("lets a Requester mark their own ticket's problem as resolved", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const ticket = await createTestTicket(requesterAgent);

    const res = await requesterAgent.post(`/api/tickets/${ticket.id}/resolve-indication`);

    expect(res.status).toBe(200);
    expect(res.body.problemAppearsResolved).toBe(true);
  });

  it("rejects marking the same ticket as resolved twice", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const ticket = await createTestTicket(requesterAgent);

    await requesterAgent.post(`/api/tickets/${ticket.id}/resolve-indication`);
    const res = await requesterAgent.post(`/api/tickets/${ticket.id}/resolve-indication`);

    expect(res.status).toBe(409);
  });

  it("rejects IT Staff from using the Requester's resolve-indication endpoint", async () => {
    const requesterAgent = await loginAgent(REQUESTER);
    const ticket = await createTestTicket(requesterAgent);

    const staffAgent = await loginAgent(STAFF);
    const res = await staffAgent.post(`/api/tickets/${ticket.id}/resolve-indication`);

    expect(res.status).toBe(403);
  });
});