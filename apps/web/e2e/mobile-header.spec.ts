import { expect, test } from "@playwright/test";
import { seedConsentCookie } from "./helpers/consent";
import {
  clearDemoSessionCookie,
  seedDemoSessionCookie,
} from "./helpers/auth";

/**
 * Guest vs signed-in header chrome (mobile viewport).
 *
 * Why separate states:
 * - Guest must see Sign in (`nav-sign-in`), never account as the primary CTA.
 * - Signed-in uses mock `wt_session=demo` (Playwright webServer + USE_MOCKS only).
 * - Brand height should stay stable across / /map /routes.
 *
 * Real Auth.js OTP / Mailgun is out of scope for this smoke.
 */
test.describe("mobile header chrome", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chrome",
      "header smoke runs on mobile-chrome only",
    );
  });

  test.use({ viewport: { width: 412, height: 915 } });

  test.beforeEach(async ({ context, baseURL }) => {
    await seedConsentCookie(context, baseURL ?? "http://127.0.0.1:3100");
  });

  for (const path of ["/", "/map", "/routes"] as const) {
    test(`guest: brand + Sign in on ${path}`, async ({ page }) => {
      await page.goto(path);
      const brand = page.getByTestId("site-brand").first();
      await expect(brand).toBeVisible();
      await expect(brand).toContainText(/Solviax\.app/i);
      await expect(page.getByTestId("nav-sign-in")).toBeVisible();
      await expect(page.getByTestId("nav-account")).toHaveCount(0);

      const header = page.locator("header").first();
      const headerBox = await header.boundingBox();
      expect(headerBox?.height).toBeGreaterThanOrEqual(56);
      expect(headerBox?.height).toBeLessThanOrEqual(72);
    });
  }

  test.describe("signed-in (demo cookie / USE_MOCKS)", () => {
    test.beforeEach(async ({ context, baseURL }) => {
      await seedDemoSessionCookie(context, baseURL ?? "http://127.0.0.1:3100");
    });

    test.afterEach(async ({ context, baseURL }) => {
      await clearDemoSessionCookie(context, baseURL ?? "http://127.0.0.1:3100");
    });

    for (const path of ["/", "/map", "/routes"] as const) {
      test(`signed-in: brand + account on ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByTestId("site-brand").first()).toBeVisible();
        await expect(page.getByTestId("nav-account")).toBeVisible();
        await expect(page.getByTestId("nav-sign-in")).toHaveCount(0);
      });
    }
  });
});
