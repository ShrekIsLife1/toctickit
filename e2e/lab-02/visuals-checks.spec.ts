import { test } from "@playwright/test";
import fs from "fs";

const SCREENSHOT_DIR = "artifacts/lab-02/screenshots";

test.beforeAll(() => {
  for (const sub of ["create-ticket", "my-tickets", "ticket-detail"]) {
    fs.mkdirSync(`${SCREENSHOT_DIR}/${sub}`, { recursive: true });
  }
});

async function selectDevRequester(page: import("@playwright/test").Page) {
  await page.goto("/select-requester");
  await page.getByLabel(/development requester/i).selectOption({ index: 1 });
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/my-tickets/);
}

test("capture Create Ticket screen", async ({ page }, testInfo) => {
  await selectDevRequester(page);
  await page.getByRole("link", { name: /create ticket/i }).click();
  await page.waitForURL(/create-ticket/);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/create-ticket/${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("capture My Tickets screen", async ({ page }, testInfo) => {
  await selectDevRequester(page);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/my-tickets/${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("capture Ticket Detail screen", async ({ page }, testInfo) => {
  await selectDevRequester(page);

  const uniqueSummary = `Visual QA test ticket ${Date.now()}`;

  await page.getByRole("link", { name: /create ticket/i }).click();
  await page.waitForURL(/create-ticket/);
  await page.getByLabel(/^category/i).selectOption({ index: 1 });
  await page.getByLabel(/related system/i).selectOption({ index: 1 });
  await page.getByLabel(/requested priority/i).selectOption({ index: 1 });
  await page.getByLabel(/^summary/i).fill(uniqueSummary);
  await page.getByLabel(/^description/i).fill("Created by the Playwright visual capture script.");
  await page.getByRole("button", { name: /^submit$/i }).click();
  await page.getByRole("button", { name: /view my tickets/i }).click();
  await page.waitForURL(/my-tickets/);

  if (testInfo.project.name === "mobile") {
    await page.locator(".d-md-none").getByText(uniqueSummary).click();
  } else {
    await page
      .locator("table tbody tr", { hasText: uniqueSummary })
      .getByRole("link")
      .click();
  }
  await page.waitForURL(/\/tickets\/\d+/);
  await page.getByText(/loading ticket/i).waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Attachments" }).waitFor({ state: "visible" });
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/ticket-detail/${testInfo.project.name}.png`,
    fullPage: true,
  });
});