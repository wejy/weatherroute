import { expect, test } from "@playwright/test";

const hasMapbox =
  Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim().startsWith("pk.")) ||
  Boolean(process.env.PLAYWRIGHT_MAPBOX_TOKEN?.trim().startsWith("pk."));

test.describe("map basemap locale", () => {
  test.skip(!hasMapbox, "requires NEXT_PUBLIC_MAPBOX_TOKEN=pk.…");

  test("localizes country-label to Finnish when wt_locale=fi", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "wt_locale",
        value: "fi",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/map");
    await expect(page.getByTestId("map-page")).toBeVisible();

    const mapRoot = page.getByTestId("mapbox-weather-map");
    await expect(mapRoot).toBeVisible({ timeout: 30_000 });
    await expect(mapRoot).toHaveAttribute("data-basemap-labels-localized", "1");
  });
});
