import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { ACTIVE_STATUSES } from "../../src/dashboards.js";

const REQUESTER_JENNIFER = { email: "jennifer.anderson@example.com", password: "ChangeMe123!" };
const STAFF_KEVIN = { email: "kevin.patel@example.com", password: "ChangeMe123!" };
const STAFF_LISA = { email: "lisa.martinez@example.com", password: "ChangeMe123!" };
const ADMIN = { email: "admin@example.com", password: "ChangeMe123!" };

async function loginAgent(creds: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(creds);
  return agent;
}

describe("Staff Dashboard API (API-17, API-18, AC-13, AC-14, BR-24)", () => {
  it("rejects unauthenticated requests with 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get("/api/dashboard/staff");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects Requesters with 403 FORBIDDEN", async () => {
    const requesterAgent = await loginAgent(REQUESTER_JENNIFER);
    const res = await requesterAgent.get("/api/dashboard/staff");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("API-17: Returns operational metrics matching independent DB queries for IT Staff", async () => {
    const staffAgent = await loginAgent(STAFF_KEVIN);
    const res = await staffAgent.get("/api/dashboard/staff");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("unassigned");
    expect(res.body).toHaveProperty("ownedByMe");
    expect(res.body).toHaveProperty("byStatus");
    expect(res.body).toHaveProperty("byItPriority");
    expect(res.body).toHaveProperty("urgent");
    expect(res.body).toHaveProperty("recentlyUpdated");

    // Staff member should NOT have userCounts
    expect(res.body.userCounts).toBeUndefined();

    const prisma = getPrisma();
    const staffUser = await prisma.user.findUnique({ where: { email: STAFF_KEVIN.email } });

    // 1. Verify unassigned active tickets
    const expectedUnassigned = await prisma.ticket.count({
      where: {
        ticketOwnerId: null,
        currentStatus: { in: ACTIVE_STATUSES },
      },
    });
    expect(res.body.unassigned).toBe(expectedUnassigned);

    // 2. Verify ownedByMe
    const expectedOwned = await prisma.ticket.count({
      where: {
        ticketOwnerId: staffUser!.id,
        currentStatus: { in: ACTIVE_STATUSES },
      },
    });
    expect(res.body.ownedByMe).toBe(expectedOwned);

    // 3. Verify byStatus map contains all 5 active statuses
    expect(res.body.byStatus).toHaveProperty("NEW");
    expect(res.body.byStatus).toHaveProperty("OPEN");
    expect(res.body.byStatus).toHaveProperty("IN_PROGRESS");
    expect(res.body.byStatus).toHaveProperty("WAITING_FOR_REQUESTER");
    expect(res.body.byStatus).toHaveProperty("REOPENED");

    // 4. Verify byItPriority map contains LOW, MEDIUM, HIGH
    expect(res.body.byItPriority).toHaveProperty("LOW");
    expect(res.body.byItPriority).toHaveProperty("MEDIUM");
    expect(res.body.byItPriority).toHaveProperty("HIGH");

    // 5. Verify urgent tickets: max 5, all active, all HIGH priority, sorted by updatedAt asc
    expect(Array.isArray(res.body.urgent)).toBe(true);
    expect(res.body.urgent.length).toBeLessThanOrEqual(5);
    for (const t of res.body.urgent) {
      expect(ACTIVE_STATUSES).toContain(t.currentStatus);
      expect(t.itPriority).toBe("HIGH");
    }

    // 6. Verify recentlyUpdated: max 5, sorted desc
    expect(Array.isArray(res.body.recentlyUpdated)).toBe(true);
    expect(res.body.recentlyUpdated.length).toBeLessThanOrEqual(5);
  });

  it("API-18: Includes userCounts for Administrator and omits for regular IT Staff", async () => {
    // 1. Test as Administrator
    const adminAgent = await loginAgent(ADMIN);
    const adminRes = await adminAgent.get("/api/dashboard/staff");

    expect(adminRes.status).toBe(200);
    expect(adminRes.body).toHaveProperty("userCounts");
    expect(adminRes.body.userCounts).toHaveProperty("active");
    expect(adminRes.body.userCounts).toHaveProperty("inactive");
    expect(adminRes.body.userCounts).toHaveProperty("byRole");

    const prisma = getPrisma();
    const expectedActiveUsers = await prisma.user.count({ where: { isActive: true } });
    const expectedInactiveUsers = await prisma.user.count({ where: { isActive: false } });

    expect(adminRes.body.userCounts.active).toBe(expectedActiveUsers);
    expect(adminRes.body.userCounts.inactive).toBe(expectedInactiveUsers);
    expect(adminRes.body.userCounts.byRole).toHaveProperty("REQUESTER");
    expect(adminRes.body.userCounts.byRole).toHaveProperty("IT_STAFF");
    expect(adminRes.body.userCounts.byRole).toHaveProperty("ADMINISTRATOR");

    // 2. Test as regular IT Staff
    const staffAgent = await loginAgent(STAFF_LISA);
    const staffRes = await staffAgent.get("/api/dashboard/staff");

    expect(staffRes.status).toBe(200);
    expect(staffRes.body.userCounts).toBeUndefined();
  });
});
