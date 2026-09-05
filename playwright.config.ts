import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
  },
  projects: [
  {
    name: "desktop",
    use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
  },
  {
    name: "tablet",
    use: { browserName: "chromium", viewport: { width: 834, height: 1194 }, isMobile: true, hasTouch: true },
  },
  {
    name: "mobile",
    use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  },
],
});
