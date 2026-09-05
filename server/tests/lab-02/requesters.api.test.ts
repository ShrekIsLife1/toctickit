import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters", () => {
  it("returns only active requesters", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);

    const emails = res.body.map((r: { email: string }) => r.email);
    expect(emails).toContain("jennifer.anderson@example.com");
    expect(emails).not.toContain("former.employee@example.com");

    expect(res.body.length).toBeGreaterThanOrEqual(4);
  });
});
