import { expect, type Page, test } from "@playwright/test";

/** Viewport width buckets used for responsive assertions. */
function widthBucket(page: Page): "mobile" | "tablet" | "desktop" {
  const w = page.viewportSize()?.width ?? 1280;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

test.describe("responsive chrome", () => {
  test("home shows brand and correct primary nav for viewport", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("site-brand")).toBeVisible();

    const bucket = widthBucket(page);
    if (bucket === "mobile") {
      await expect(page.getByTestId("bottom-nav")).toBeVisible();
      await expect(page.getByTestId("top-nav-links")).toBeHidden();
    } else {
      // md+ shows top links; bottom nav stays until lg
      await expect(page.getByTestId("top-nav-links")).toBeVisible();
      if (bucket === "desktop") {
        // Bottom nav is lg:hidden — still visible at tablet, hidden at lg+
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
    await page.goto("/");
    const filters = page.getByTestId("weather-filters");
    await expect(filters).toBeVisible();

    // Let auto-geolocation settle so its replace doesn't race the chip click.
    await page
      .waitForURL(/[?&]lat=/, { timeout: 12_000 })
      .catch(() => undefined);

    const sun = filters.getByTestId("weather-filter-sun");
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
    await expect(page.getByTestId("routes-page")).toBeVisible();
    await expect(page.getByTestId("route-endpoints-form")).toBeVisible();
  });

  test("discover query params survive map navigation", async ({ page }) => {
    await page.goto(
      "/?origin=Helsinki&lat=60.17&lon=24.94&weatherGoal=dry&distance=semi&datePreset=weekend",
    );
    const mapLink = page
      .getByTestId("weather-filters")
      .getByRole("link", { name: /map|kartta/i });
    // Map chip may be present; otherwise use bottom/top nav
    if (await mapLink.count()) {
      await mapLink.first().click();
    } else {
      const navMap = page
        .locator('[data-testid="bottom-nav"], [data-testid="top-nav-links"]')
        .getByRole("link", { name: /map|kartta/i })
        .first();
      await navMap.click();
    }
    await expect(page).toHaveURL(/\/map/);
    await expect(page).toHaveURL(/weatherGoal=dry/);
    await expect(page).toHaveURL(/origin=Helsinki/);
    await expect(page).toHaveURL(/distance=semi/);
  });
});
