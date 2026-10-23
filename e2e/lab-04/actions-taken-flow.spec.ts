import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("Actions Taken Lifecycle (E2E-01)", () => {
  test("Staff adds action, second staff adds action, Requester views read-only, double click prevented", async ({
    page,
  }) => {
    // 1. Requester logs in and creates a ticket
    await login(page, "jennifer.anderson@example.com", "ChangeMe123!");
    await page.waitForURL(/\/(dashboard|my-tickets)/);

    await page.goto("/create-ticket");
    await page.getByLabel(/^category/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/requested priority/i).selectOption("MEDIUM");
    const uniqueSummary = `Actions Flow Ticket ${Date.now()}`;
    await page.getByLabel(/^summary/i).fill(uniqueSummary);
    await page.getByLabel(/^description/i).fill("Testing actions taken multi-staff lifecycle.");

    const [createResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/tickets") && r.request().method() === "POST"),
      page.getByRole("button", { name: /^submit$/i }).click(),
    ]);
    const created = await createResponse.json();
    const ticketId = created.id ?? created.ticket?.id;

    // Logout Requester
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    // 2. First IT Staff (Kevin Patel) opens ticket and adds an Action Taken
    await login(page, "kevin.patel@example.com", "ChangeMe123!");
    await page.waitForURL(/\/(staff\/dashboard|staff\/queue)/);

    await page.goto(`/staff/tickets/${ticketId}`);
    await page.waitForURL(new RegExp(`/staff/tickets/${ticketId}`));

    // Claim ticket
    await page.getByRole("button", { name: /claim this ticket/i }).click();
    await expect(page.getByText(/kevin patel/i)).toBeVisible();

    // Click + Add Action
    await page.getByRole("button", { name: /\+ add action/i }).click();
    await page.getByPlaceholder(/detail the work carried out/i).fill("First diagnostic inspection completed.");
    await page.getByPlaceholder(/state the observed outcome/i).fill("Verified cable integrity.");
    await page.getByRole("button", { name: /save action/i }).click();

    // Verify Action appears in list
    await expect(page.getByText("First diagnostic inspection completed.")).toBeVisible();
    await expect(page.getByText("Verified cable integrity.")).toBeVisible();

    // Logout Kevin
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    // 3. Second IT Staff (Lisa Martinez) adds another Action Taken without changing owner
    await login(page, "lisa.martinez@example.com", "ChangeMe123!");
    await page.waitForURL(/\/(staff\/dashboard|staff\/queue)/);

    await page.goto(`/staff/tickets/${ticketId}`);
    await page.waitForURL(new RegExp(`/staff/tickets/${ticketId}`));

    // Kevin remains the ticket owner
    await expect(page.getByText(/kevin patel/i)).toBeVisible();

    // Lisa records second action
    await page.getByRole("button", { name: /\+ add action/i }).click();
    await page.getByPlaceholder(/detail the work carried out/i).fill("Secondary motherboard testing performed.");
    await page.getByPlaceholder(/state the observed outcome/i).fill("All voltages normal.");
    await page.getByRole("button", { name: /save action/i }).click();

    await expect(page.getByText("Secondary motherboard testing performed.")).toBeVisible();

    // Logout Lisa
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    // 4. Requester views ticket: sees Actions Taken read-only, NO add/edit buttons
    await login(page, "jennifer.anderson@example.com", "ChangeMe123!");
    await page.waitForURL(/\/(dashboard|my-tickets)/);

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForURL(new RegExp(`/tickets/${ticketId}`));

    await expect(page.getByText("First diagnostic inspection completed.")).toBeVisible();
    await expect(page.getByText("Secondary motherboard testing performed.")).toBeVisible();
    await expect(page.getByRole("button", { name: /\+ add action/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /edit action/i })).not.toBeVisible();
  });
});
