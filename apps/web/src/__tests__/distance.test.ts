import {
  CUSTOM_RADIUS_DEFAULT_KM,
  CUSTOM_RADIUS_MAX_KM,
  DISTANCE_RADIUS_KM,
  clampDistanceForTier,
  resolveRadiusKm,
} from "@/lib/distance";

describe("resolveRadiusKm", () => {
  it("maps presets to fixed radii", () => {
    expect(resolveRadiusKm("near")).toBe(DISTANCE_RADIUS_KM.near);
    expect(resolveRadiusKm("region")).toBe(300);
    expect(resolveRadiusKm("continent")).toBe(1000);
  });

  it("defaults unknown / missing to neighborhood (free max)", () => {
    expect(resolveRadiusKm(undefined)).toBe(DISTANCE_RADIUS_KM.neighborhood);
    expect(resolveRadiusKm("nope")).toBe(DISTANCE_RADIUS_KM.neighborhood);
  });

  it("clamps custom radius", () => {
    expect(resolveRadiusKm("custom")).toBe(CUSTOM_RADIUS_DEFAULT_KM);
    expect(resolveRadiusKm("custom", 50)).toBe(50);
    expect(resolveRadiusKm("custom", -10)).toBe(0);
    expect(resolveRadiusKm("custom", 99999)).toBe(CUSTOM_RADIUS_MAX_KM);
    expect(resolveRadiusKm("custom", 120.6)).toBe(121);
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
});
