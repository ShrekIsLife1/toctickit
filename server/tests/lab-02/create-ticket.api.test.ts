import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const VALID_TICKET = {
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Laptop battery drains quickly",
  description: "Battery drains much faster than usual even when the system is idle.",
  requestedPriority: "MEDIUM",
};

describe("POST /api/tickets", () => {
  it("creates a ticket with valid data and returns a generated ticket number", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send(VALID_TICKET);

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.requesterId).toBe(1);
  });

  it("rejects a request with no X-Requester-Id header", async () => {
    const res = await request(app).post("/api/tickets").send(VALID_TICKET);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_REQUESTER");
  });

  it("rejects a request with a summary that is too short", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({ ...VALID_TICKET, summary: "Hi" });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.summary).toBeDefined();
  });

  it("rejects a request with a missing description", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({ ...VALID_TICKET, description: undefined });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.description).toBeDefined();
  });

  it("rejects an invalid requestedPriority value", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({ ...VALID_TICKET, requestedPriority: "URGENT" });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.requestedPriority).toBeDefined();
  });

  it("rejects an unknown categoryId", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({ ...VALID_TICKET, categoryId: 9999 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNKNOWN_REFERENCE");
  });

  it("rejects an inactive or unknown requester id", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "9999")
      .send(VALID_TICKET);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_REQUESTER");
  });
});