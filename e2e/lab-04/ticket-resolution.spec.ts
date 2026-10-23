import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("Ticket Resolution & Gate Lifecycle (E2E-02)", () => {
  test("Resolution gate enforcement, Requester advisory resolve, Staff resolution, and stale update protection", async ({
    page,
  }) => {
    // 1. Requester creates ticket
    await login(page, "jennifer.anderson@example.com", "ChangeMe123!");
    await page.waitForURL(/\/(dashboard|my-tickets)/);

    await page.goto("/create-ticket");
    await page.getByLabel(/^category/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/requested priority/i).selectOption("HIGH");
    const uniqueSummary = `Resolution Gate Ticket ${Date.now()}`;
    await page.getByLabel(/^summary/i).fill(uniqueSummary);
    await page.getByLabel(/^description/i).fill("Testing resolution gate and advisory marking.");

    const [createResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/tickets") && r.request().method() === "POST"),
      page.getByRole("button", { name: /^submit$/i }).click(),
    ]);
    const created = await createResponse.json();
    const ticketId = created.id ?? created.ticket?.id;

    // Logout Requester
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    // 2. Staff tries to resolve immediately without owner and without actions taken -> blocked by gate
    await login(page, "kevin.patel@example.com", "ChangeMe123!");
    await page.waitForURL(/\/(staff\/dashboard|staff\/queue)/);

    await page.goto(`/staff/tickets/${ticketId}`);
    await page.waitForURL(new RegExp(`/staff/tickets/${ticketId}`));

    // Status transition to OPEN first
    const statusSelect = page.locator("select").nth(1);
    await statusSelect.selectOption("OPEN");
    await expect(statusSelect).toHaveValue("OPEN");

    await statusSelect.selectOption("IN_PROGRESS");
    await expect(statusSelect).toHaveValue("IN_PROGRESS");

    // Attempt to move to RESOLVED before assigning owner or actions taken
    await statusSelect.selectOption("RESOLVED");
    // Inline resolution gate warning banner appears
    await expect(page.getByText(/cannot be resolved until all resolution gate requirements are satisfied/i)).toBeVisible();
    await expect(page.getByText(/must have an assigned owner/i)).toBeVisible();
    await expect(page.getByText(/must have at least one Action Taken recorded/i)).toBeVisible();

    // 3. Claim ticket and record action taken
    await page.getByRole("button", { name: /claim this ticket/i }).click();
    await expect(page.getByText(/kevin patel/i)).toBeVisible();

    await page.getByRole("button", { name: /\+ add action/i }).click();
    await page.getByPlaceholder(/detail the work carried out/i).fill("Replaced faulty power supply.");
    await page.getByPlaceholder(/state the observed outcome/i).fill("System boots normally.");
    await page.getByRole("button", { name: /save action/i }).click();
    await expect(page.getByText("Replaced faulty power supply.").first()).toBeVisible();

    // Logout Staff
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    // 4. Requester marks problem as resolved (advisory)
    await login(page, "jennifer.anderson@example.com", "ChangeMe123!");
    await page.waitForURL(/\/(dashboard|my-tickets)/);

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForURL(new RegExp(`/tickets/${ticketId}`));

    const resolveBtn = page.getByRole("button", { name: /mark problem as resolved/i });
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Status remains IN_PROGRESS, but advisory indicator is marked
    await expect(page.getByText(/you marked this as resolved/i)).toBeVisible();

    // Logout Requester
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    // 5. Staff completes resolution successfully
    await login(page, "kevin.patel@example.com", "ChangeMe123!");
    await page.waitForURL(/\/(staff\/dashboard|staff\/queue)/);

    await page.goto(`/staff/tickets/${ticketId}`);
    await page.waitForURL(new RegExp(`/staff/tickets/${ticketId}`));

    const currentStatusSelect = page.locator("select").nth(1);
    await currentStatusSelect.selectOption("RESOLVED");
    await expect(currentStatusSelect).toHaveValue("RESOLVED");
  });
});
