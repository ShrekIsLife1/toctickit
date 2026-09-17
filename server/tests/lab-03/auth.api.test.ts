import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const REQUESTER_EMAIL = "jennifer.anderson@example.com";
const REQUESTER_PASSWORD = "ChangeMe123!";

describe("Authentication", () => {
  it("logs in with valid credentials and returns a session cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(REQUESTER_EMAIL);
    expect(res.body.role).toBe("REQUESTER");
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects a wrong password with a generic message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: REQUESTER_EMAIL, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("rejects an unknown email with the same generic message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "whatever123!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("rejects login for an inactive account with the same generic message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "former.employee@example.com", password: REQUESTER_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("returns the current user via /me when authenticated", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD });

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(REQUESTER_EMAIL);
  });

  it("rejects /me without a session", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("logs out and invalidates the session", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD });

    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).toBe(200);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(401);
  });

  it("changes the password with a valid current password and strong new password", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD });

    const res = await agent
      .post("/api/auth/change-password")
      .send({ currentPassword: REQUESTER_PASSWORD, newPassword: "New-Passw0rd!2" });

    expect(res.status).toBe(200);

    // Revert back so the seed stays stable for other test runs.
    await agent
      .post("/api/auth/change-password")
      .send({ currentPassword: "New-Passw0rd!2", newPassword: REQUESTER_PASSWORD });
  });

  it("rejects a weak new password", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD });

    const res = await agent
      .post("/api/auth/change-password")
      .send({ currentPassword: REQUESTER_PASSWORD, newPassword: "weak" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("WEAK_PASSWORD");
  });

  it("rejects change-password with a wrong current password", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD });

    const res = await agent
      .post("/api/auth/change-password")
      .send({ currentPassword: "totally-wrong", newPassword: "New-Passw0rd!2" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
  });
});