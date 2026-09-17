import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("IT Staff ticket flow", () => {
  test("E2E-02: full workflow — Requester creates ticket and comments, IT Staff claims/triages/resolves, Requester confirms, Internal Note stays hidden from Requester", async ({
    page,
  }) => {
    const uniqueSummary = `E2E staff flow ${Date.now()}`;

    // 1. Requester creates a Ticket and posts a Public Comment.
    await login(page, "jennifer.anderson@example.com", "ChangeMe123!");
    await page.waitForURL(/my-tickets/);

    await page.getByRole("link", { name: /create ticket/i }).first().click();    await page.waitForURL(/create-ticket/);
    await page.getByLabel(/^category/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/requested priority/i).selectOption({ index: 1 });
    await page.getByLabel(/^summary/i).fill(uniqueSummary);
    await page.getByLabel(/^description/i).fill("Ticket created for the full IT Staff workflow E2E test.");
    await page.getByRole("button", { name: /^submit$/i }).click();
    await page.getByRole("button", { name: /view my tickets/i }).click();
    await page.waitForURL(/my-tickets/);

    await page.locator("table tbody tr", { hasText: uniqueSummary }).getByRole("link").click();
    await page.waitForURL(/\/tickets\/\d+/);
    const requesterTicketUrl = page.url();
    const ticketId = requesterTicketUrl.match(/\/tickets\/(\d+)/)?.[1];

    await page.getByPlaceholder(/type your comment here/i).fill("Requester's initial public comment.");
    await page.getByRole("button", { name: /post comment/i }).click();
    await expect(page.getByText("Requester's initial public comment.")).toBeVisible();

    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    // 2. IT Staff claims the ticket, sets IT Priority, moves status, and adds
    //    both a Public Comment and an Internal Note.
    await login(page, "kevin.patel@example.com", "ChangeMe123!");
    await page.waitForURL(/staff\/queue/);

    await page.getByPlaceholder(/search by ticket number/i).fill(uniqueSummary);
    await page.locator("table tbody tr", { hasText: uniqueSummary }).getByRole("link").click();
    await page.waitForURL(/\/staff\/tickets\/\d+/);

    await page.getByRole("button", { name: /claim this ticket/i }).click();
    await expect(page.getByText(/kevin patel/i)).toBeVisible();

    await page.locator("select").filter({ hasText: /not yet triaged/i }).selectOption("HIGH");
    await expect(page.locator("select").filter({ hasText: "HIGH" })).toBeVisible();

    const statusSelect = page.locator("select").nth(1);
    await statusSelect.selectOption("OPEN");
    await statusSelect.selectOption("IN_PROGRESS");
    await statusSelect.selectOption("RESOLVED");

    await page.getByPlaceholder(/type your comment here/i).fill("We resolved the issue on our end.");
    await page.getByRole("button", { name: /post comment/i }).click();

    await page.getByPlaceholder(/type an internal note/i).fill("Internal-only diagnostic details.");
    await page.getByRole("button", { name: /post note/i }).click();
    await expect(page.getByText("Internal-only diagnostic details.")).toBeVisible();

    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/login/);

    // 3. Requester confirms: sees the Public Comment, marks problem resolved,
    //    and never sees the Internal Note anywhere.
    await login(page, "jennifer.anderson@example.com", "ChangeMe123!");
    await page.waitForURL(/my-tickets/);
    await page.goto(requesterTicketUrl);

    await expect(page.getByText("We resolved the issue on our end.")).toBeVisible();
    await expect(page.getByText("Internal-only diagnostic details.")).not.toBeVisible();

    await page.getByRole("button", { name: /mark problem as resolved/i }).click();
    await expect(page.getByText(/you marked this as resolved/i)).toBeVisible();

    expect(ticketId).toBeTruthy();
  });
});