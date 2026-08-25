import { expect, type Page, test } from "@playwright/test";
import { seedConsentCookie } from "./helpers/consent";

/** Viewport width buckets used for responsive assertions. */
function widthBucket(page: Page): "mobile" | "tablet" | "desktop" {
  const w = page.viewportSize()?.width ?? 1280;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

test.describe("responsive chrome", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await seedConsentCookie(context, baseURL ?? "http://127.0.0.1:3100");
  });

  test("home shows brand and correct primary nav for viewport", async ({
    page,
  }) => {
    await page.goto("/");
    const brand = page.getByRole("banner").getByTestId("site-brand");
    await expect(brand).toBeVisible();
    await expect(brand).toContainText(/Solviax\.app/i);

    const bucket = widthBucket(page);
    if (bucket === "mobile") {
      await expect(page.getByTestId("bottom-nav")).toBeVisible();
      await expect(page.getByTestId("top-nav-links")).toBeHidden();
    } else {
      // md+ shows top links; bottom nav stays until lg
      await expect(page.getByTestId("top-nav-links")).toBeVisible();
      if (bucket === "desktop") {
        const bottom = page.getByTestId("bottom-nav");
        const w = page.viewportSize()?.width ?? 0;
        if (w >= 1024) {
          await expect(bottom).toBeHidden();
        } else {
          await expect(bottom).toBeVisible();
        }
      }
    }
  });

  test("home weather filters are interactive", async ({ page }) => {
    // Seed origin so coarse geo cannot race the chip; USE_MOCKS gate allows
    // active discover without SoftPaywall (no DB quota).
    await page.goto(
      "/?origin=Helsinki&lat=60.17&lon=24.94&weatherGoal=best&distance=neighborhood&datePreset=weekend&mode=driving",
    );
    const filters = page.getByTestId("weather-filters");
    await expect(filters).toBeVisible();

    const sun = filters.getByTestId("weather-filter-sun");
    await expect(sun).toBeVisible();
    await sun.click();
    await expect(page).toHaveURL(/weatherGoal=sun/);
    await expect(sun).toHaveAttribute("aria-pressed", "true");
  });
  test("map page layout adapts", async ({ page }) => {
    await page.goto("/map");
    await expect(page.getByTestId("map-page")).toBeVisible();

    const bucket = widthBucket(page);
    if (bucket === "mobile") {
      await expect(page.getByTestId("bottom-nav")).toBeVisible();
      // Side nav is desktop-oriented; on mobile filters live in floating UI
      await expect(page.getByTestId("map-side-nav")).toBeHidden();
    } else if (bucket === "desktop") {
      const w = page.viewportSize()?.width ?? 0;
      if (w >= 1024) {
        await expect(page.getByTestId("map-side-nav")).toBeVisible();
      }
    }
  });

  test("routes page shows endpoint form", async ({ page }) => {
    await page.goto("/routes");
    // Empty /routes may be need-destination or paywall; form is always present.
    await expect(
      page.locator(
        '[data-testid="routes-page"], [data-testid="routes-page-need-destination"], [data-testid="routes-page-paywall"]',
      ),
    ).toBeVisible();
    await expect(page.getByTestId("route-endpoints-form")).toBeVisible();
  });

  test("discover query params survive map navigation", async ({ page }) => {
    await page.goto(
      "/?origin=Helsinki&lat=60.17&lon=24.94&weatherGoal=dry&distance=semi&datePreset=weekend",
    );
    const mapLink = page
      .getByTestId("weather-filters")
      .getByRole("link", { name: /map|kartta/i });
    if (await mapLink.count()) {
      await mapLink.first().click();
    } else {
      const navMap = page
        .locator('[data-testid="bottom-nav"], [data-testid="top-nav-links"]')
        .getByRole("link", { name: /map|kartta/i })
        .first();
      await expect(navMap).toBeVisible();
      await navMap.click();
    }
    await expect(page).toHaveURL(/\/map/);
    await expect(page).toHaveURL(/weatherGoal=dry/);
    await expect(page).toHaveURL(/origin=Helsinki/);
    await expect(page).toHaveURL(/distance=semi/);
  });
});
