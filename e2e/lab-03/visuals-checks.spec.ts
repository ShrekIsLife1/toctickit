import { test } from "@playwright/test";
import fs from "fs";

const SCREENSHOT_DIR = "artifacts/lab-03/screenshots";

test.beforeAll(() => {
  for (const sub of ["authentication", "staff-queue", "staff-ticket-detail", "user-management"]) {
    fs.mkdirSync(`${SCREENSHOT_DIR}/${sub}`, { recursive: true });
  }
});

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("capture Login screen", async ({ page }, testInfo) => {
  await page.goto("/login");
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/authentication/login-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("capture IT Staff Ticket Queue screen", async ({ page }, testInfo) => {
  await login(page, "kevin.patel@example.com", "ChangeMe123!");
  await page.waitForURL(/staff\/queue/);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/staff-queue/${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("capture IT Staff Ticket Detail screen", async ({ page }, testInfo) => {
  await login(page, "kevin.patel@example.com", "ChangeMe123!");
  await page.waitForURL(/staff\/queue/);

  if (testInfo.project.name === "mobile") {
    await page.locator(".d-md-none").first().click();
  } else {
    await page.locator("table tbody tr").first().getByRole("link").click();
  }
  await page.waitForURL(/\/staff\/tickets\/\d+/);

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/staff-ticket-detail/${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("capture User Management screen", async ({ page }, testInfo) => {
  await login(page, "admin@example.com", "ChangeMe123!");
  await page.waitForURL(/admin\/users/);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/user-management/${testInfo.project.name}.png`,
    fullPage: true,
  });
});