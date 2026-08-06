import {
  CUSTOM_RADIUS_DEFAULT_KM,
  CUSTOM_RADIUS_MAX_KM,
  DISTANCE_RADIUS_KM,
  clampDistanceForTier,
  formatDistanceKm,
  kmToMiles,
  resolveRadiusKm,
} from "@/lib/distance";

describe("resolveRadiusKm", () => {
  it("maps presets to fixed radii", () => {
    expect(resolveRadiusKm("near")).toBe(DISTANCE_RADIUS_KM.near);
    expect(resolveRadiusKm("region")).toBe(300);
    expect(resolveRadiusKm("continent")).toBe(1000);
  });

  it("defaults unknown / missing to surroundings (default radius)", () => {
    expect(resolveRadiusKm(undefined)).toBe(DISTANCE_RADIUS_KM.surroundings);
    expect(resolveRadiusKm("nope")).toBe(DISTANCE_RADIUS_KM.surroundings);
  });

  it("clamps custom radius", () => {
    expect(resolveRadiusKm("custom")).toBe(CUSTOM_RADIUS_DEFAULT_KM);
    expect(resolveRadiusKm("custom", 50)).toBe(50);
    expect(resolveRadiusKm("custom", -10)).toBe(0);
    expect(resolveRadiusKm("custom", 99999)).toBe(CUSTOM_RADIUS_MAX_KM);
    expect(resolveRadiusKm("custom", 120.6)).toBe(121);
  });
});

describe("formatDistanceKm", () => {
  it("appends miles for English", () => {
    expect(formatDistanceKm(200, "en")).toBe("200 km (~124 mi)");
    expect(formatDistanceKm(30, "en")).toBe("30 km (~19 mi)");
  });

  it("keeps Finnish as kilometres only", () => {
    expect(formatDistanceKm(200, "fi")).toBe("200 km");
    expect(formatDistanceKm(1000, "fi")).toBe("1\u00a0000 km");
  });
});

describe("kmToMiles", () => {
  it("rounds to nearest mile", () => {
    expect(kmToMiles(200)).toBe(124);
    expect(kmToMiles(0)).toBe(0);
  });
});

describe("clampDistanceForTier", () => {
  it("allows Pro any distance", () => {
    expect(clampDistanceForTier("continent", undefined, "pro")).toEqual({
      distance: "continent",
      radiusKm: undefined,
      clamped: false,
    });
    expect(clampDistanceForTier("custom", 800, "pro")).toEqual({
      distance: "custom",
      radiusKm: 800,
      clamped: false,
    });
  });

  it("clamps Region / Continent / Custom for free and anon", () => {
    expect(clampDistanceForTier("region", undefined, "free").distance).toBe(
      "neighborhood",
    );
    expect(clampDistanceForTier("continent", undefined, "anon").clamped).toBe(
      true,
    );
    expect(clampDistanceForTier("custom", 500, "free")).toEqual({
      distance: "neighborhood",
      clamped: true,
    });
  });

  it("keeps free presets", () => {
    expect(clampDistanceForTier("near", undefined, "free").clamped).toBe(false);
    expect(
      clampDistanceForTier("neighborhood", undefined, "anon").distance,
    ).toBe("neighborhood");
  });

  it("uses surroundings when distance is omitted", () => {
    expect(clampDistanceForTier(undefined, undefined, "free").distance).toBe(
      "surroundings",
    );
    expect(clampDistanceForTier(null, undefined, "pro").distance).toBe(
      "surroundings",
    );
  });
});
