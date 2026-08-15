import {
  destinationHref,
  isLinkableDestinationId,
  isMapboxFeatureId,
  locationFromParams,
  markerNavHrefs,
  pickParams,
  preserveDiscoverHref,
  routesHref,
  withQuery,
} from "@/lib/discover-query";

describe("withQuery", () => {
  it("appends and merges query params", () => {
    expect(withQuery("/map", { weatherGoal: "sun" })).toBe(
      "/map?weatherGoal=sun",
    );
    expect(
      withQuery("/map?origin=Helsinki", { weatherGoal: "sun", mode: "driving" }),
    ).toBe("/map?origin=Helsinki&weatherGoal=sun&mode=driving");
  });

  it("skips null/empty values and preserves hash", () => {
    expect(withQuery("/#results", { a: "", b: null, c: "1" })).toBe(
      "/?c=1#results",
    );
  });

  it("lets extra overwrite existing keys", () => {
    expect(withQuery("/?mode=driving", { mode: "cycling" })).toBe(
      "/?mode=cycling",
    );
  });
});

describe("pickParams / locationFromParams", () => {
  it("reads from URLSearchParams", () => {
    const params = new URLSearchParams(
      "origin=Tampere&lat=61.5&lon=23.8&noise=1",
    );
    expect(pickParams(params, ["origin", "lat", "lon"])).toEqual({
      origin: "Tampere",
      lat: "61.5",
      lon: "23.8",
    });
  });

  it("reads first value from Next searchParams objects", () => {
    expect(
      locationFromParams({
        origin: ["Helsinki", "ignored"],
        lat: "60.17",
        lon: undefined,
      }),
    ).toEqual({ origin: "Helsinki", lat: "60.17" });
  });
});

describe("destinationHref / routesHref", () => {
  it("encodes destination slug and carries trip filters", () => {
    expect(
      destinationHref("gn:658225", {
        datePreset: "weekend",
        startDate: "2026-07-25",
        endDate: "2026-07-26",
        distance: "region",
        radiusKm: 300,
        weatherGoal: "sun",
        origin: "Helsinki",
        lat: 60.17,
        lon: 24.94,
        mode: "driving",
      }),
    ).toBe(
      "/destinations/gn%3A658225?datePreset=weekend&startDate=2026-07-25&endDate=2026-07-26&distance=region&radiusKm=300&weatherGoal=sun&origin=Helsinki&lat=60.17&lon=24.94&mode=driving",
    );
  });

  it("builds routes URL with from defaulting to origin", () => {
    expect(
      routesHref({
        to: "Tampere",
        origin: "Helsinki",
        datePreset: "custom",
        startDate: "2026-07-26",
        endDate: "2026-07-28",
        distance: "semi",
        weatherGoal: "dry",
      }),
    ).toBe(
      "/routes?from=Helsinki&to=Tampere&datePreset=custom&startDate=2026-07-26&endDate=2026-07-28&distance=semi&weatherGoal=dry&origin=Helsinki",
    );
  });
});

describe("preserveDiscoverHref", () => {
  it("carries date filters from map to routes (not only location)", () => {
    const current = new URLSearchParams(
      "origin=Helsinki&lat=60.17&lon=24.94&datePreset=today&mode=cycling&distance=semi&weatherGoal=sun",
    );
    expect(preserveDiscoverHref("/routes", current)).toBe(
      "/routes?origin=Helsinki&lat=60.17&lon=24.94&datePreset=today&distance=semi&weatherGoal=sun&mode=cycling&from=Helsinki",
    );
  });

  it("keeps custom date range and departure window on routes nav", () => {
    const current = new URLSearchParams(
      "origin=Tampere&datePreset=custom&startDate=2026-07-28&endDate=2026-07-30&departureStartHour=8&departureEndHour=12",
    );
    const href = preserveDiscoverHref("/routes", current);
    expect(href).toContain("datePreset=custom");
    expect(href).toContain("startDate=2026-07-28");
    expect(href).toContain("endDate=2026-07-30");
    expect(href).toContain("departureStartHour=8");
    expect(href).toContain("departureEndHour=12");
    expect(href).toContain("from=Tampere");
  });

  it("maps routes from/to back onto discover and map", () => {
    const current = new URLSearchParams(
      "from=Oulu&to=Turku&datePreset=tomorrow&mode=driving",
    );
    expect(preserveDiscoverHref("/map", current)).toBe(
      "/map?datePreset=tomorrow&mode=driving&origin=Oulu",
    );
    expect(preserveDiscoverHref("/", current)).toContain("origin=Oulu");
    expect(preserveDiscoverHref("/", current)).toContain("datePreset=tomorrow");
  });

  it("preserves destination slug query and merges current filters", () => {
    const current = new URLSearchParams(
      "origin=Helsinki&datePreset=weekend&weatherGoal=dry",
    );
    expect(
      preserveDiscoverHref("/destinations/gn%3A658225?mode=cycling", current),
    ).toBe(
      "/destinations/gn%3A658225?mode=cycling&origin=Helsinki&datePreset=weekend&weatherGoal=dry",
    );
  });
});

describe("isMapboxFeatureId / isLinkableDestinationId", () => {
  it("detects Mapbox feature ids", () => {
    expect(isMapboxFeatureId("place.2099272")).toBe(true);
    expect(isMapboxFeatureId("address.abc")).toBe(true);
    expect(isMapboxFeatureId("gn:123")).toBe(false);
  });

  it("only links catalog / geonames style ids", () => {
    expect(isLinkableDestinationId("gn:658225")).toBe(true);
    expect(isLinkableDestinationId("helsinki")).toBe(true);
    expect(isLinkableDestinationId("place.1")).toBe(false);
    expect(isLinkableDestinationId("coord-60-24")).toBe(false);
    expect(isLinkableDestinationId("origin-helsinki")).toBe(false);
    expect(isLinkableDestinationId(null)).toBe(false);
  });
});

describe("markerNavHrefs", () => {
  it("builds destination + routes links with filters", () => {
    const { destinationHref: dest, routeHref } = markerNavHrefs(
      { id: "gn:123", name: "Tampere" },
      {
        origin: "Helsinki",
        lat: 60.17,
        lon: 24.94,
        datePreset: "today",
        mode: "cycling",
        weatherGoal: "sun",
      },
    );
    expect(dest).toContain("/destinations/gn%3A123");
    expect(dest).toContain("datePreset=today");
    expect(dest).toContain("origin=Helsinki");
    expect(routeHref).toContain("/routes?");
    expect(routeHref).toContain("from=Helsinki");
    expect(routeHref).toContain("to=Tampere");
    expect(routeHref).toContain("datePreset=today");
    expect(routeHref).toContain("mode=cycling");
  });

  it("omits destination link for origin markers", () => {
    const { destinationHref: dest, routeHref } = markerNavHrefs(
      { id: "origin-x", name: "Helsinki" },
      { origin: "Helsinki", datePreset: "weekend" },
    );
    expect(dest).toBeUndefined();
    expect(routeHref).toContain("to=Helsinki");
  });
});
