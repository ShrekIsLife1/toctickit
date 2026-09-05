import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REQUESTER_A = "1";
const REQUESTER_B = "2";
const RUN_ID = Date.now(); // unique per test run, avoids cross-run collisions

async function createTicket(requesterId: string, overrides: Partial<Record<string, unknown>> = {}) {
  const res = await request(app)
    .post("/api/tickets")
    .set("X-Requester-Id", requesterId)
    .send({
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
    let ticketA1: { ticketNumber: string };
    let ticketA2: { ticketNumber: string };

    beforeAll(async () => {
    ticketA1 = await createTicket(REQUESTER_A, { summary: `Laptop battery drains quickly ${RUN_ID}` });
    ticketA2 = await createTicket(REQUESTER_A, { summary: `VPN connection keeps dropping ${RUN_ID}`, requestedPriority: "HIGH" });
    await createTicket(REQUESTER_B, { summary: `Requester B's own ticket ${RUN_ID}` });
    });

  it("returns only tickets belonging to the selected requester", async () => {
    const res = await request(app).get("/api/tickets").set("X-Requester-Id", REQUESTER_A);

    expect(res.status).toBe(200);
    const summaries = res.body.data.map((t: { summary: string }) => t.summary);
    expect(summaries).toContain(`Laptop battery drains quickly ${RUN_ID}`);
    expect(summaries).toContain(`VPN connection keeps dropping ${RUN_ID}`);
    expect(summaries).not.toContain(`Requester B's own ticket ${RUN_ID}`);
  });

    it("filters by search matching the summary", async () => {
    const res = await request(app)
        .get(`/api/tickets?search=VPN connection keeps dropping ${RUN_ID}`)
        .set("X-Requester-Id", REQUESTER_A);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].summary).toBe(`VPN connection keeps dropping ${RUN_ID}`);
    });

  it("filters by requestedPriority", async () => {
    const res = await request(app)
      .get("/api/tickets?requestedPriority=HIGH")
      .set("X-Requester-Id", REQUESTER_A);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { requestedPriority: string }) => t.requestedPriority === "HIGH")).toBe(true);
  });

  it("returns an empty data array with total 0 when filters match nothing", async () => {
    const res = await request(app)
      .get("/api/tickets?search=nonexistent-xyz-123")
      .set("X-Requester-Id", REQUESTER_A);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it("respects pagination metadata", async () => {
    const res = await request(app)
      .get("/api/tickets?pageSize=1&page=1")
      .set("X-Requester-Id", REQUESTER_A);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.pageSize).toBe(1);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  it("rejects a request with no X-Requester-Id header", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_REQUESTER");
  });
});