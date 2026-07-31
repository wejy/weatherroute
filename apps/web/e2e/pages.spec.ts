import { expect, test } from "@playwright/test";

/**
 * Narrow smoke for login / settings chrome across viewports.
 * Runs in the same responsive projects as responsive.spec.ts.
 */
test.describe("secondary pages", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#main-content")).toContainText(
      /welcome|tervetuloa|email|sähköposti|send code|lähetä/i,
    );
  });

  test("settings page renders", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("#main-content")).toContainText(
      /settings|asetukset/i,
    );
  });
});
