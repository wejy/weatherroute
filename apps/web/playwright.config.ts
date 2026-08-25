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
          // Dedicated script — do not append another --port (conflicts with `npm run dev`).
          // Inline env so npm cannot drop empty DATABASE_URL / miss Playwright env merge.
          command: `USE_MOCKS=true USE_MOCK_WEATHER=true CRON_ENABLED=false ANON_DISCOVER_LIMIT=1000 ANON_IP_DISCOVER_LIMIT=1000 ANON_SESSION_MINT_LIMIT=1000 AUTH_SECRET=playwright-test-secret-not-for-production PORT=${PORT} NEXT_PUBLIC_APP_URL=${baseURL} AUTH_URL=${baseURL} npm run dev:e2e -w @solviax/web`,
          url: baseURL,
          // Default fresh server so USE_MOCKS / anon limits always apply.
          // Set PLAYWRIGHT_REUSE=1 to attach to an already-running :3100.
          reuseExistingServer: process.env.PLAYWRIGHT_REUSE === "1",
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
            ANON_DISCOVER_LIMIT: "1000",
            ANON_IP_DISCOVER_LIMIT: "1000",
            ANON_SESSION_MINT_LIMIT: "1000",
            // Unset DB so getDb() is null even if shell/.env has DATABASE_URL
            // (empty string can be dropped by some spawners).
            DATABASE_URL: "postgresql://playwright:playwright@127.0.0.1:1/none",
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
        // Avoid iPad Mini's isMobile/webkit profile — Chromium + isMobile
        // can report fixed header brand as "hidden" despite painting.
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
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
