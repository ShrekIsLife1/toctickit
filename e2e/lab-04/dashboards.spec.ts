import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("Multi-Role Dashboard Experience (E2E-03)", () => {
  test("Requester dashboard displays counts and navigates to filtered queues", async ({ page }) => {
    await login(page, "jennifer.anderson@example.com", "ChangeMe123!");
    await page.waitForURL(/\/dashboard/);

    await expect(page.getByText(/welcome back, jennifer!/i)).toBeVisible();
    await expect(page.getByText(/my open tickets/i)).toBeVisible();
    await expect(page.getByText(/waiting for you/i)).toBeVisible();
    await expect(page.getByText(/recently resolved/i)).toBeVisible();

    // Click on My Open Tickets card
    await page.getByLabel(/my open tickets:/i).click();
    await page.waitForURL(/\/my-tickets\?status=active/);

    // Logout
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);
  });

  test("IT Staff dashboard displays operational metrics and omits Admin user widget", async ({ page }) => {
    await login(page, "kevin.patel@example.com", "ChangeMe123!");
    await page.waitForURL(/\/staff\/dashboard/);

    await expect(page.getByText(/welcome back, kevin!/i)).toBeVisible();
    await expect(page.getByText(/unassigned/i).first()).toBeVisible();
    await expect(page.getByText(/my assigned/i).first()).toBeVisible();

    // Verify Admin User Accounts widget is omitted for IT Staff
    await expect(page.getByText(/system user accounts/i)).not.toBeVisible();

    // Click Unassigned card
    await page.getByLabel(/unassigned tickets:/i).click();
    await page.waitForURL(/\/staff\/queue\?owner=unassigned/);

    // Logout
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);
  });

  test("Administrator dashboard displays operational queue and includes User Accounts widget", async ({
    page,
  }) => {
    await login(page, "admin@example.com", "ChangeMe123!");
    await page.waitForURL(/\/staff\/dashboard/);

    await expect(page.getByText(/welcome back, administrator!|welcome back, admin!/i)).toBeVisible();
    await expect(page.getByText(/system user accounts/i)).toBeVisible();
    await expect(page.getByText(/active users/i)).toBeVisible();

    // Click Manage Users link
    await page.getByRole("link", { name: /manage users/i }).click();
    await page.waitForURL(/\/admin\/users/);
  });
});
