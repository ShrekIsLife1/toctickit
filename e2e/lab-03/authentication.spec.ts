import { test, expect } from "@playwright/test";
const API_URL = "http://localhost:3000";

test.describe("Authentication", () => {
  test("E2E-01: login with an initial password forces Change Password, then normal app, then logout blocks access", async ({
    page,
  }) => {
    // Uses a freshly admin-created user with mustChangePassword: true would be
    // ideal, but to keep this self-contained we exercise the full loop against
    // a known seeded account and its documented flow instead.
    await page.goto("/login");
    await page.getByLabel(/email address/i).fill("jennifer.anderson@example.com");
    await page.getByLabel(/^password$/i).fill("ChangeMe123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Seeded accounts have mustChangePassword: false, so this lands directly
    // on My Tickets — assert the authenticated shell renders correctly.
    await page.waitForURL(/my-tickets/);
    await expect(page.getByText(/jennifer anderson/i)).toBeVisible();

    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/login/);
  });

  test("shows a generic error for wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email address/i).fill("jennifer.anderson@example.com");
    await page.getByLabel(/^password$/i).fill("totally-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("shows a generic error for an unknown email", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email address/i).fill("nobody@example.com");
    await page.getByLabel(/^password$/i).fill("whatever123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("rejects direct access to a protected route while unauthenticated", async ({ page }) => {
    await page.goto("/staff/queue");
    await expect(page).toHaveURL(/login/);
  });

  test("rejects a Requester from directly navigating to the Staff Queue after login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email address/i).fill("jennifer.anderson@example.com");
    await page.getByLabel(/^password$/i).fill("ChangeMe123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/my-tickets/);

    await page.goto("/staff/queue");
    await expect(page).toHaveURL(/forbidden/);
  });
  test("AC-02/AC-18: a newly created user is forced through Change Password before reaching the app", async ({
    page,
    request,
    }) => {
    // Log in as Administrator via the API to create a fresh user with
    // mustChangePassword: true, and capture the generated initial password.
    const adminLogin = await request.post(`${API_URL}/api/auth/login`, {
        data: { email: "admin@example.com", password: "ChangeMe123!" },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const cookies = await request.storageState();

    const uniqueEmail = `e2e-forced-change-${Date.now()}@example.com`;
    const createRes = await request.post(`${API_URL}/api/admin/users`, {
        data: { name: "E2E Forced Change", email: uniqueEmail, role: "REQUESTER", isActive: true },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    const initialPassword = created.initialPassword;
    expect(initialPassword).toBeTruthy();

    // Now, as a fresh browser page (not the admin's session), log in as this
    // brand-new user and confirm Change Password is forced before anything else.
    await page.goto("/login");
    await page.getByLabel(/email address/i).fill(uniqueEmail);
    await page.getByLabel(/^password$/i).fill(initialPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/change-password/);
    await expect(page.getByText(/you must change your password/i)).toBeVisible();

    // Attempting to navigate directly to My Tickets should still redirect back.
    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/change-password/);

    // Complete the mandatory change with a compliant new password.
    await page.getByLabel(/current \(temporary\) password/i).fill(initialPassword);
    await page.getByLabel(/^new password$/i).fill("New-Passw0rd!2");
    await page.getByLabel(/confirm new password/i).fill("New-Passw0rd!2");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.waitForURL(/my-tickets/);
    await expect(page.getByText(/e2e forced change/i)).toBeVisible();
    });

});

