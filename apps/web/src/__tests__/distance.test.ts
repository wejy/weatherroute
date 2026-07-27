import {
  CUSTOM_RADIUS_DEFAULT_KM,
  CUSTOM_RADIUS_MAX_KM,
  DISTANCE_RADIUS_KM,
  resolveRadiusKm,
} from "@/lib/distance";

describe("resolveRadiusKm", () => {
  it("maps presets to fixed radii", () => {
    expect(resolveRadiusKm("near")).toBe(DISTANCE_RADIUS_KM.near);
    expect(resolveRadiusKm("region")).toBe(300);
    expect(resolveRadiusKm("continent")).toBe(1000);
  });

  it("defaults unknown / missing to region", () => {
    expect(resolveRadiusKm(undefined)).toBe(DISTANCE_RADIUS_KM.region);
    expect(resolveRadiusKm("nope")).toBe(DISTANCE_RADIUS_KM.region);
  });

  it("clamps custom radius", () => {
    expect(resolveRadiusKm("custom")).toBe(CUSTOM_RADIUS_DEFAULT_KM);
    expect(resolveRadiusKm("custom", 50)).toBe(50);
    expect(resolveRadiusKm("custom", -10)).toBe(0);
    expect(resolveRadiusKm("custom", 99999)).toBe(CUSTOM_RADIUS_MAX_KM);
    expect(resolveRadiusKm("custom", 120.6)).toBe(121);
  });
});
