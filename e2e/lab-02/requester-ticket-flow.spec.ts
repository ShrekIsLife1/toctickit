import { test, expect } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";

const REQUESTER_CREDENTIALS: Record<string, { email: string; password: string }> = {
  "Jennifer Anderson": { email: "jennifer.anderson@example.com", password: "ChangeMe123!" },
  "Michael Brown": { email: "michael.brown@example.com", password: "ChangeMe123!" },
};

async function loginAsRequester(page: Page, name: string) {
  const creds = REQUESTER_CREDENTIALS[name];
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(creds.email);
  await page.getByLabel(/^password$/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/my-tickets/);
}

async function createTicket(page: Page, summary: string, description: string): Promise<number> {
  await page.getByRole("link", { name: /create ticket/i }).first().click();
  await page.waitForURL(/create-ticket/);
  await page.getByLabel(/^category/i).selectOption({ index: 1 });
  await page.getByLabel(/related system/i).selectOption({ index: 1 });
  await page.getByLabel(/requested priority/i).selectOption({ index: 1 });
  await page.getByLabel(/^summary/i).fill(summary);
  await page.getByLabel(/^description/i).fill(description);

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/tickets") && res.request().method() === "POST"),
    page.getByRole("button", { name: /^submit$/i }).click(),
  ]);
  const created = await response.json();

  await page.getByRole("button", { name: /view my tickets/i }).click();
  await page.waitForURL(/my-tickets/);

  return created.id;
}

async function openTicketById(page: Page, ticketId: number) {
  await page.goto(`/tickets/${ticketId}`);
  await page.waitForURL(/\/tickets\/\d+/);
}

test.describe("Requester ticket flow (Lab 2 regression under Lab 3 auth)", () => {
  test("E2E-01: full create-ticket flow shows the official ticket number", async ({ page }) => {
    await loginAsRequester(page, "Jennifer Anderson");

    const uniqueSummary = `E2E create flow ${Date.now()}`;
    await createTicket(
      page,
      uniqueSummary,
      "Full end-to-end flow test description, long enough to pass validation."
    );

    await expect(page.locator("text=/TKT-\\d{4}-\\d{6}/ >> visible=true").first()).toBeVisible();
  });

  test("E2E-02: switching requester (logout/login) hides the other requester's tickets", async ({ page }) => {
    await loginAsRequester(page, "Jennifer Anderson");

    const uniqueSummary = `E2E ownership test ${Date.now()}`;
    await createTicket(page, uniqueSummary, "Ticket created to verify cross-requester isolation.");

    await expect(page.locator(`text=${uniqueSummary} >> visible=true`).first()).toBeVisible();

    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);
    await loginAsRequester(page, "Michael Brown");

    await expect(page.getByText(uniqueSummary)).not.toBeVisible();
  });

  test("E2E-03: download an active attachment, then soft-remove it and confirm it's blocked", async ({ page }) => {
    await loginAsRequester(page, "Jennifer Anderson");

    const uniqueSummary = `E2E attachment flow ${Date.now()}`;
    const ticketId = await createTicket(page, uniqueSummary, "Ticket created to verify the attachment lifecycle.");
    console.log("DEBUG ticketId:", ticketId);
    await openTicketById(page, ticketId);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "e2e-test-file.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content for e2e test"),
    });

    await expect(page.getByText("e2e-test-file.pdf")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("e2e-test-file.pdf");

    await page.getByRole("button", { name: /^remove$/i }).click();
    await page.getByPlaceholder(/removal reason/i).fill("E2E test removal reason");
    await page.getByRole("button", { name: /confirm/i }).click();

    await expect(page.getByText(/removed/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /download/i })).not.toBeVisible();
  });

  test("E2E-04: opening another requester's ticket via direct URL shows a safe not-found state", async ({ page }) => {
    await loginAsRequester(page, "Jennifer Anderson");

    const uniqueSummary = `E2E cross-access test ${Date.now()}`;
    const ticketId = await createTicket(page, uniqueSummary, "Ticket used to test cross-requester direct URL access.");
    await openTicketById(page, ticketId);
    const ticketUrl = page.url();

    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);
    await loginAsRequester(page, "Michael Brown");

    await page.goto(ticketUrl);

    await expect(page.getByText(/could not be found, or you do not have access/i)).toBeVisible();
  });
});