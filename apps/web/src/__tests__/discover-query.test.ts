import {
  destinationHref,
  isLinkableDestinationId,
  isMapboxFeatureId,
  locationFromParams,
  pickParams,
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
    expect(isLinkableDestinationId(null)).toBe(false);
  });
});
