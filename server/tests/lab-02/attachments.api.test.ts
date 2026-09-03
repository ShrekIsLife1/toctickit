import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REQUESTER_A = "1";
const REQUESTER_B = "2";

async function createTicket(requesterId: string) {
  const res = await request(app)
    .post("/api/tickets")
    .set("X-Requester-Id", requesterId)
    .send({
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
  let ticketId: number;

  beforeAll(async () => {
    const ticket = await createTicket(REQUESTER_A);
    ticketId = ticket.id;
  });

  it("uploads a valid attachment", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", REQUESTER_A)
      .attach("file", pdfBuffer(), "report.pdf");

    expect(res.status).toBe(201);
    expect(res.body.originalFilename).toBe("report.pdf");
    expect(res.body.isRemoved).toBe(false);
  });

  it("rejects an unsupported file type", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", REQUESTER_A)
      .attach("file", Buffer.from("not a real exe"), { filename: "virus.exe", contentType: "application/x-msdownload" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_TYPE");
  });

  it("downloads an active attachment", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", REQUESTER_A)
      .attach("file", pdfBuffer(), "downloadable.pdf");

    const downloadRes = await request(app)
      .get(`/api/attachments/${uploadRes.body.id}/download`)
      .set("X-Requester-Id", REQUESTER_A);

    expect(downloadRes.status).toBe(200);
  });

  it("rejects downloading an attachment belonging to another requester's ticket", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", REQUESTER_A)
      .attach("file", pdfBuffer(), "private.pdf");

    const res = await request(app)
      .get(`/api/attachments/${uploadRes.body.id}/download`)
      .set("X-Requester-Id", REQUESTER_B);

    expect(res.status).toBe(404);
  });

  it("soft-removes an attachment with a valid reason", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", REQUESTER_A)
      .attach("file", pdfBuffer(), "to-remove.pdf");

    const removeRes = await request(app)
      .delete(`/api/attachments/${uploadRes.body.id}`)
      .set("X-Requester-Id", REQUESTER_A)
      .send({ reason: "Duplicate file, no longer needed" });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);
    expect(removeRes.body.removalReason).toBe("Duplicate file, no longer needed");
  });

  it("rejects removal without a reason", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", REQUESTER_A)
      .attach("file", pdfBuffer(), "needs-reason.pdf");

    const res = await request(app)
      .delete(`/api/attachments/${uploadRes.body.id}`)
      .set("X-Requester-Id", REQUESTER_A)
      .send({});

    expect(res.status).toBe(400);
  });

  it("rejects downloading a removed attachment", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", REQUESTER_A)
      .attach("file", pdfBuffer(), "removed-then-download.pdf");

    await request(app)
      .delete(`/api/attachments/${uploadRes.body.id}`)
      .set("X-Requester-Id", REQUESTER_A)
      .send({ reason: "Testing removed download rejection" });

    const downloadRes = await request(app)
      .get(`/api/attachments/${uploadRes.body.id}/download`)
      .set("X-Requester-Id", REQUESTER_A);

    expect(downloadRes.status).toBe(404);
  });

  it("rejects a 6th active attachment on the same ticket", async () => {
    const freshTicket = await createTicket(REQUESTER_A);

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post(`/api/tickets/${freshTicket.id}/attachments`)
        .set("X-Requester-Id", REQUESTER_A)
        .attach("file", pdfBuffer(), `file-${i}.pdf`);
      expect(res.status).toBe(201);
    }

    const sixthRes = await request(app)
      .post(`/api/tickets/${freshTicket.id}/attachments`)
      .set("X-Requester-Id", REQUESTER_A)
      .attach("file", pdfBuffer(), "file-6.pdf");

    expect(sixthRes.status).toBe(409);
    expect(sixthRes.body.error.code).toBe("ATTACHMENT_LIMIT_REACHED");
  });

  it("lists attachment metadata including removed items", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", REQUESTER_A);

    expect(res.status).toBe(200);
    expect(res.body.some((a: { isRemoved: boolean }) => a.isRemoved === true)).toBe(true);
    expect(res.body.some((a: { isRemoved: boolean }) => a.isRemoved === false)).toBe(true);
  });
});