import type { BrowserContext } from "@playwright/test";

/** Matches demo session cookie when USE_MOCKS=true (Playwright webServer). */
const DEMO_COOKIE = "wt_session";

/**
 * Signed-in smoke for e2e mock server only (`USE_MOCKS=true`).
 * Sets the demo session cookie so `getCurrentUser()` returns the mock user.
 */
export async function seedDemoSessionCookie(
  context: BrowserContext,
  baseURL: string,
): Promise<void> {
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: DEMO_COOKIE,
      value: "demo",
      domain: url.hostname,
      path: "/",
      sameSite: "Lax",
      httpOnly: true,
    },
  ]);
}

export async function clearDemoSessionCookie(
  context: BrowserContext,
  baseURL: string,
): Promise<void> {
  const url = new URL(baseURL);
  await context.clearCookies({ name: DEMO_COOKIE, domain: url.hostname });
}
