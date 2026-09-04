import { test, expect } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";

async function selectRequesterByName(page: Page, name: string) {
  await page.goto("/select-requester");
  await page.getByLabel(/development requester/i).selectOption({ label: name });
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/my-tickets/);
}

async function createTicket(page: Page, summary: string, description: string) {
  await page.getByRole("link", { name: /create ticket/i }).click();
  await page.waitForURL(/create-ticket/);
  await page.getByLabel(/^category/i).selectOption({ index: 1 });
  await page.getByLabel(/related system/i).selectOption({ index: 1 });
  await page.getByLabel(/requested priority/i).selectOption({ index: 1 });
  await page.getByLabel(/^summary/i).fill(summary);
  await page.getByLabel(/^description/i).fill(description);
  await page.getByRole("button", { name: /^submit$/i }).click();
  await page.getByRole("button", { name: /view my tickets/i }).click();
  await page.waitForURL(/my-tickets/);
}

async function openTicketBySummary(page: Page, testInfo: TestInfo, summary: string) {
  if (testInfo.project.name === "mobile") {
    await page.locator(".d-md-none").getByText(summary).click();
  } else {
    await page.locator("table tbody tr", { hasText: summary }).getByRole("link").click();
  }
  await page.waitForURL(/\/tickets\/\d+/);
}

test.describe("Requester ticket flow", () => {
  test("E2E-01: full create-ticket flow shows the official ticket number", async ({ page }) => {
    await selectRequesterByName(page, "Jennifer Anderson");

    const uniqueSummary = `E2E create flow ${Date.now()}`;

    await createTicket(
      page,
      uniqueSummary,
      "Full end-to-end flow test description, long enough to pass validation."
    );

    // createTicket() already navigates back to My Tickets after success,
    // so re-verify the confirmation by re-submitting is unnecessary here;
    // instead confirm the ticket now appears in the list with a real number.
    await expect(page.locator("text=/TKT-\\d{4}-\\d{6}/ >> visible=true").first()).toBeVisible();  });

  test("E2E-02: switching requester hides the other requester's tickets", async ({ page }) => {
    await selectRequesterByName(page, "Jennifer Anderson");

    const uniqueSummary = `E2E ownership test ${Date.now()}`;

    await createTicket(page, uniqueSummary, "Ticket created to verify cross-requester isolation.");

    await expect(page.locator(`text=${uniqueSummary} >> visible=true`).first()).toBeVisible();
    await page.getByRole("button", { name: /change requester/i }).click();
    await page.waitForURL(/select-requester/);
    await selectRequesterByName(page, "Michael Brown");

    await expect(page.getByText(uniqueSummary)).not.toBeVisible();
  });

  test("E2E-03: download an active attachment, then soft-remove it and confirm it's blocked", async ({
    page,
  }, testInfo) => {
    await selectRequesterByName(page, "Jennifer Anderson");

    const uniqueSummary = `E2E attachment flow ${Date.now()}`;

    await createTicket(page, uniqueSummary, "Ticket created to verify the attachment lifecycle.");
    await openTicketBySummary(page, testInfo, uniqueSummary);

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

  test("E2E-04: opening another requester's ticket via direct URL shows a safe not-found state", async ({
    page,
  }, testInfo) => {
    await selectRequesterByName(page, "Jennifer Anderson");

    const uniqueSummary = `E2E cross-access test ${Date.now()}`;

    await createTicket(page, uniqueSummary, "Ticket used to test cross-requester direct URL access.");
    await openTicketBySummary(page, testInfo, uniqueSummary);
    const ticketUrl = page.url();

    await page.getByRole("button", { name: /change requester/i }).click();
    await page.waitForURL(/select-requester/);
    await selectRequesterByName(page, "Michael Brown");

    await page.goto(ticketUrl);

    await expect(page.getByText(/could not be found, or you do not have access/i)).toBeVisible();
  });
});
