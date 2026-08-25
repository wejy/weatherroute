import type { BrowserContext, Page } from "@playwright/test";

/** Matches `CONSENT_COOKIE` / `CONSENT_VERSION` in apps/web/src/lib/consent.ts */
const CONSENT_COOKIE = "wt_consent";

/**
 * Seed analytics-off consent so the cookie banner never mounts and
 * cannot intercept clicks (weather chips, bottom nav, etc.).
 */
export async function seedConsentCookie(
  context: BrowserContext,
  baseURL: string,
): Promise<void> {
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: CONSENT_COOKIE,
      value: JSON.stringify({
        v: 1,
        analytics: false,
        updatedAt: new Date().toISOString(),
      }),
      domain: url.hostname,
      path: "/",
      sameSite: "Lax",
    },
  ]);
}

/** Fallback if a test navigates before cookies apply. */
export async function dismissConsentBannerIfPresent(page: Page): Promise<void> {
  const accept = page.getByRole("button", {
    name: /accept all|hyväksy kaikki/i,
  });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}
