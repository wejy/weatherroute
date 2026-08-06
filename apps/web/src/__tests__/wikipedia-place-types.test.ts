import {
  classifyPlaceInstanceOf,
  coordsWithinKm,
  haversineKm,
} from "@/server/integrations/wikipedia/place-types";

describe("wikipedia place-types", () => {
  it("allows settlement instance-of QIDs", () => {
    expect(classifyPlaceInstanceOf(["Q515"])).toBe("allow");
    expect(classifyPlaceInstanceOf(["Q127448"])).toBe("allow");
  });

  it("denies humans and companies even if a place QID is also listed", () => {
    expect(classifyPlaceInstanceOf(["Q5"])).toBe("deny");
    expect(classifyPlaceInstanceOf(["Q5", "Q515"])).toBe("deny");
    expect(classifyPlaceInstanceOf(["Q4830453"])).toBe("deny");
  });

  it("returns unknown for empty or unrecognized QIDs", () => {
    expect(classifyPlaceInstanceOf([])).toBe("unknown");
    expect(classifyPlaceInstanceOf(["Q999999999"])).toBe("unknown");
  });

  it("computes haversine distances", () => {
    // Helsinki → Espoo is roughly 15–20 km
    const km = haversineKm(60.1699, 24.9384, 60.2055, 24.6559);
    expect(km).toBeGreaterThan(10);
    expect(km).toBeLessThan(30);
  });

  it("checks proximity threshold", () => {
    expect(
      coordsWithinKm(
        { lat: 60.17, lon: 24.94 },
        { lat: 60.18, lon: 24.95 },
        8,
      ),
    ).toBe(true);
    expect(
      coordsWithinKm(
        { lat: 60.17, lon: 24.94 },
        { lat: 61.5, lon: 23.8 },
        8,
      ),
    ).toBe(false);
  });
});
