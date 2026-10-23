import { test } from "@playwright/test";
import fs from "fs";

const SCREENSHOT_DIR = "artifacts/lab-04/screenshots";

test.beforeAll(() => {
  for (const sub of ["staff-dashboard", "requester-dashboard", "actions-taken"]) {
    fs.mkdirSync(`${SCREENSHOT_DIR}/${sub}`, { recursive: true });
  }
});

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("capture IT Staff Dashboard screen", async ({ page }, testInfo) => {
  await login(page, "admin@example.com", "ChangeMe123!");
  await page.waitForURL(/staff\/dashboard/);
  // Wait for metrics to load
  await page.waitForSelector(".metric-card, .dashboard-metric-card, .card");
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/staff-dashboard/${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("capture Requester Dashboard screen", async ({ page }, testInfo) => {
  await login(page, "jennifer.anderson@example.com", "ChangeMe123!");
  await page.waitForURL(/\/dashboard/);
  await page.waitForSelector(".metric-card, .dashboard-metric-card, .card");
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/requester-dashboard/${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("capture Actions Taken on Ticket Detail screen", async ({ page }, testInfo) => {
  await login(page, "kevin.patel@example.com", "ChangeMe123!");
  await page.waitForURL(/\/(staff\/dashboard|staff\/queue)/);

  // Navigate to ticket detail with actions taken
  await page.goto("/staff/tickets/1");
  await page.waitForURL(/\/staff\/tickets\/1/);
  await page.getByText(/actions taken/i).first().waitFor({ state: "visible" });

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/actions-taken/${testInfo.project.name}.png`,
    fullPage: true,
  });
});
