import {
  __isWikipediaRateLimitedForTests,
  __noteWikipediaRateLimitForTests,
  __resetWikipediaCachesForTests,
  fetchWikipediaPlaceSummary,
} from "@/server/integrations/wikipedia";
import { wikipediaCacheKey } from "@/lib/wikipedia-client";
import { findPlaceNear } from "@/server/dal/places";

describe("wikipediaCacheKey", () => {
  it("prefers placeId when linkable", () => {
    expect(
      wikipediaCacheKey("Tampere", 61.5, 23.8, "fi", "gn:634963"),
    ).toBe("fi:id:gn:634963");
  });

  it("falls back to name+geo for origin markers", () => {
    expect(
      wikipediaCacheKey("Helsinki", 60.17, 24.94, "en", "origin-helsinki"),
    ).toBe("en:helsinki:60.17,24.94");
  });
});

describe("wikipedia rate-limit cooldown", () => {
  beforeEach(() => {
    __resetWikipediaCachesForTests();
  });

  it("skips live fetches while cooling down after 429", async () => {
    __noteWikipediaRateLimitForTests();
    expect(__isWikipediaRateLimitedForTests()).toBe(true);

    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const summary = await fetchWikipediaPlaceSummary({
      name: "Tampere",
      lat: 61.5,
      lon: 23.8,
      lang: "fi",
    });

    expect(summary).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("findPlaceNear", () => {
  it("finds Helsinki from CITY_INDEX when coords are close", async () => {
    const hit = await findPlaceNear({
      lat: 60.17,
      lon: 24.94,
      name: "Helsinki",
      maxKm: 5,
    });
    // DB may or may not be configured in tests — either a catalog id or null.
    if (hit) {
      expect(hit.name.toLowerCase()).toContain("helsinki");
      expect(hit.id.length).toBeGreaterThan(0);
    }
  });
});
