import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getRollingCutoffDate, ACTIVE_STATUSES } from "../../src/dashboards.js";

const REQUESTER_JENNIFER = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };
const REQUESTER_DAVID = { email: "david.lee@example.com", password: "ChangeMe123!" };
const STAFF_KEVIN = { email: "kevin.patel@example.com", password: "ChangeMe123!" };
const ADMIN = { email: "admin@example.com", password: "ChangeMe123!" };

async function loginAgent(creds: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(creds);
  return agent;
}

describe("UNIT-04: Dashboard Rolling Date Calculations & Active Status Filters", () => {
  it("calculates accurate 7-day rolling cutoff date", () => {
    const fixedNow = new Date("2026-10-24T12:00:00.000Z");
    const cutoff = getRollingCutoffDate(7, fixedNow);
    const expected = new Date("2026-10-17T12:00:00.000Z");

    expect(cutoff.toISOString()).toBe(expected.toISOString());
    expect(fixedNow.getTime() - cutoff.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("defines active statuses accurately without resolved or terminal statuses", () => {
    expect(ACTIVE_STATUSES).toEqual(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"]);
    expect(ACTIVE_STATUSES).not.toContain("RESOLVED");
    expect(ACTIVE_STATUSES).not.toContain("CLOSED");
    expect(ACTIVE_STATUSES).not.toContain("CANCELLED");
  });
});

describe("Requester Dashboard API (API-15, API-16, AC-02, BR-27, BR-29)", () => {
  it("rejects unauthenticated requests with 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get("/api/dashboard/requester");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects IT Staff and Administrator access with 403 FORBIDDEN", async () => {
    const staffAgent = await loginAgent(STAFF_KEVIN);
    const staffRes = await staffAgent.get("/api/dashboard/requester");
    expect(staffRes.status).toBe(403);
    expect(staffRes.body.error.code).toBe("FORBIDDEN");

    const adminAgent = await loginAgent(ADMIN);
    const adminRes = await adminAgent.get("/api/dashboard/requester");
    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error.code).toBe("FORBIDDEN");
  });

  it("API-15: Returns only metrics and tickets owned by the calling requester", async () => {
    const jenniferAgent = await loginAgent(REQUESTER_JENNIFER);
    const res = await jenniferAgent.get("/api/dashboard/requester");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("openTickets");
    expect(res.body).toHaveProperty("waitingForRequester");
    expect(res.body).toHaveProperty("recentlyResolved");
    expect(res.body).toHaveProperty("closedTickets");
    expect(res.body).toHaveProperty("recentlyUpdated");

    expect(typeof res.body.openTickets).toBe("number");
    expect(typeof res.body.waitingForRequester).toBe("number");
    expect(typeof res.body.recentlyResolved).toBe("number");
    expect(typeof res.body.closedTickets).toBe("number");
    expect(Array.isArray(res.body.recentlyUpdated)).toBe(true);
    expect(res.body.recentlyUpdated.length).toBeLessThanOrEqual(5);

    // Verify independent query matches for Jennifer
    const prisma = getPrisma();
    const jenniferUser = await prisma.user.findUnique({ where: { email: REQUESTER_JENNIFER.email } });
    const expectedOpen = await prisma.ticket.count({
      where: {
        requesterId: jenniferUser!.id,
        currentStatus: { in: ACTIVE_STATUSES },
      },
    });
    expect(res.body.openTickets).toBe(expectedOpen);

    // Ensure none of the returned tickets belong to another user
    for (const t of res.body.recentlyUpdated) {
      const dbTicket = await prisma.ticket.findUnique({ where: { id: t.id } });
      expect(dbTicket?.requesterId).toBe(jenniferUser!.id);
    }
  });

  it("API-16: Returns 200 with zeros and empty array for requester with no tickets", async () => {
    // Check or create a fresh requester with 0 tickets
    const prisma = getPrisma();
    const emptyRequesterEmail = "empty.requester@example.com";
    let emptyUser = await prisma.user.findUnique({ where: { email: emptyRequesterEmail } });

    if (!emptyUser) {
      const { hashPassword } = await import("../../src/auth.js");
      emptyUser = await prisma.user.create({
        data: {
          name: "Empty Requester",
          email: emptyRequesterEmail,
          passwordHash: await hashPassword("ChangeMe123!"),
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false,
        },
      });
    }

    const emptyAgent = await loginAgent({ email: emptyRequesterEmail, password: "ChangeMe123!" });
    const res = await emptyAgent.get("/api/dashboard/requester");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      openTickets: 0,
      waitingForRequester: 0,
      recentlyResolved: 0,
      closedTickets: 0,
      recentlyUpdated: [],
    });
  });
});
