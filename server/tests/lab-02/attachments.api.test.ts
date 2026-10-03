import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REQUESTER_A = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };
const REQUESTER_B = { email: "michael.brown@example.com", password: "ChangeMe123!" };

async function loginAgent(creds: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(creds);
  return agent;
}

async function createTicket(agent: ReturnType<typeof request.agent>) {
  const res = await agent.post("/api/tickets").send({
    categoryId: 1,
    relatedSystemId: 1,
    summary: `Attachment test ticket ${Date.now()}`,
    description: "Ticket created to exercise the attachment lifecycle in tests.",
    requestedPriority: "MEDIUM",
  });
  return res.body;
}

function pdfBuffer() {
  return Buffer.from("%PDF-1.4 fake pdf content for testing");
}

describe("Attachment lifecycle", () => {
  let agentA: ReturnType<typeof request.agent>;
  let agentB: ReturnType<typeof request.agent>;
  let ticketId: number;

  beforeAll(async () => {
    agentA = await loginAgent(REQUESTER_A);
    agentB = await loginAgent(REQUESTER_B);
    const ticket = await createTicket(agentA);
    ticketId = ticket.id;
  });

  it("uploads a valid attachment", async () => {
    const res = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", pdfBuffer(), "report.pdf");

    expect(res.status).toBe(201);
    expect(res.body.originalFilename).toBe("report.pdf");
    expect(res.body.isRemoved).toBe(false);
  });

  it("rejects an unsupported file type", async () => {
    const res = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", Buffer.from("not a real exe"), { filename: "virus.exe", contentType: "application/x-msdownload" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_TYPE");
  });

  it("downloads an active attachment", async () => {
    const uploadRes = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", pdfBuffer(), "downloadable.pdf");

    const downloadRes = await agentA.get(`/api/attachments/${uploadRes.body.id}/download`);

    expect(downloadRes.status).toBe(200);
  });

  it("rejects downloading an attachment belonging to another requester's ticket", async () => {
    const uploadRes = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", pdfBuffer(), "private.pdf");

    const res = await agentB.get(`/api/attachments/${uploadRes.body.id}/download`);

    expect(res.status).toBe(404);
  });

  it("soft-removes an attachment with a valid reason", async () => {
    const uploadRes = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", pdfBuffer(), "to-remove.pdf");

    const removeRes = await agentA
      .delete(`/api/attachments/${uploadRes.body.id}`)
      .send({ reason: "Duplicate file, no longer needed" });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);
    expect(removeRes.body.removalReason).toBe("Duplicate file, no longer needed");
  });

  it("rejects removal without a reason", async () => {
    const uploadRes = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", pdfBuffer(), "needs-reason.pdf");

    const res = await agentA.delete(`/api/attachments/${uploadRes.body.id}`).send({});

    expect(res.status).toBe(400);
  });

  it("rejects downloading a removed attachment", async () => {
    const uploadRes = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", pdfBuffer(), "removed-then-download.pdf");

    await agentA
      .delete(`/api/attachments/${uploadRes.body.id}`)
      .send({ reason: "Testing removed download rejection" });

    const downloadRes = await agentA.get(`/api/attachments/${uploadRes.body.id}/download`);

    expect(downloadRes.status).toBe(404);
  });

  it("rejects a 6th active attachment on the same ticket", async () => {
    const freshTicket = await createTicket(agentA);

    for (let i = 0; i < 5; i++) {
      const res = await agentA
        .post(`/api/tickets/${freshTicket.id}/attachments`)
        .attach("file", pdfBuffer(), `file-${i}.pdf`);
      expect(res.status).toBe(201);
    }

    const sixthRes = await agentA
      .post(`/api/tickets/${freshTicket.id}/attachments`)
      .attach("file", pdfBuffer(), "file-6.pdf");

    expect(sixthRes.status).toBe(409);
    expect(sixthRes.body.error.code).toBe("ATTACHMENT_LIMIT_REACHED");
  });

  it("lists attachment metadata including removed items", async () => {
    const res = await agentA.get(`/api/tickets/${ticketId}/attachments`);

    expect(res.status).toBe(200);
    expect(res.body.some((a: { isRemoved: boolean }) => a.isRemoved === true)).toBe(true);
    expect(res.body.some((a: { isRemoved: boolean }) => a.isRemoved === false)).toBe(true);
  });
});