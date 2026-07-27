import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
/** Skip spawning Next when an existing server is used (avoids Next.js single-dev lock). */
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: `npm run dev -- --port ${PORT}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: {
            ...process.env,
            USE_MOCKS: "true",
            USE_MOCK_WEATHER: "true",
            PORT: String(PORT),
            NEXT_PUBLIC_APP_URL: baseURL,
            AUTH_URL: baseURL,
            AUTH_SECRET: "playwright-test-secret-not-for-production",
            CRON_ENABLED: "false",
            // Prefer mocks even if a local DATABASE_URL is set in the shell.
            DATABASE_URL: "",
          },
        },
      }),
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "tablet-chrome",
      use: {
        ...devices["iPad Mini"],
        // Chromium-friendly tablet viewport
        defaultBrowserType: "chromium",
      },
    },
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "desktop-wide",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1536, height: 960 },
      },
    },
  ],
});
