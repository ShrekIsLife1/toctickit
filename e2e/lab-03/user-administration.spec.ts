import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("User administration", () => {
  test("E2E-03: Administrator creates a user, hits duplicate email, edits, resets password, and cannot self-deactivate; non-Admin is denied", async ({
    page,
  }) => {
    const uniqueEmail = `e2e-admin-test-${Date.now()}@example.com`;

    await login(page, "admin@example.com", "ChangeMe123!");
    await page.waitForURL(/admin\/users/);

    // 1. Create a user, confirm the initial password is shown.
    await page.getByRole("button", { name: /create user/i }).click();
    await page.getByLabel(/full name/i).fill("E2E Admin Test User");
    await page.getByLabel(/email address/i).fill(uniqueEmail);
    await page.getByRole("button", { name: /^save user$/i }).click();

    await expect(page.getByText(/initial password/i)).toBeVisible();

    // 2. Hit a duplicate-email error.
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await page.getByRole("button", { name: /create user/i }).click();
    await page.getByLabel(/full name/i).fill("Duplicate Attempt");
    await page.getByLabel(/email address/i).fill(uniqueEmail);
    await page.getByRole("button", { name: /^save user$/i }).click();

    await expect(page.getByText(/email already in use/i)).toBeVisible();
    await page.getByRole("button", { name: /^cancel$/i }).click();

    // 3. Edit the newly created user's name.
    await page.getByPlaceholder(/search users/i).fill(uniqueEmail);
    await page.locator("tr", { hasText: uniqueEmail }).getByRole("button", { name: /edit/i }).click();
    await page.getByLabel(/full name/i).fill("E2E Admin Test User Edited");
    await page.getByRole("button", { name: /^save user$/i }).click();

    await expect(page.getByText(/user updated/i)).toBeVisible();

    // 4. Reset the user's password.
    await page.locator("tr", { hasText: uniqueEmail }).getByRole("button", { name: /edit/i }).click();
    await page.getByRole("button", { name: /set new initial password/i }).click();

    await expect(page.getByText(/new initial password/i)).toBeVisible();
    await page.getByRole("button", { name: /^cancel$/i }).click();

    // 5. Cannot deactivate own account.
    await page.getByPlaceholder(/search users/i).fill("admin@example.com");
    await page.locator("tr", { hasText: "admin@example.com" }).getByRole("button", { name: /edit/i }).click();

    await expect(page.getByRole("button", { name: /deactivate user/i })).toBeDisabled();

    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    // 6. A non-Administrator is denied access to /admin/users.
    await login(page, "kevin.patel@example.com", "ChangeMe123!");
    await page.waitForURL(/staff\/queue/);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/forbidden/);
  });
});