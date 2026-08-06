import {
  discoverQuerySchema,
  routeQuerySchema,
  searchQuerySchema,
} from "@/lib/validation/schemas";

describe("discoverQuerySchema", () => {
  it("applies defaults", () => {
    const parsed = discoverQuerySchema.parse({});
    expect(parsed.datePreset).toBe("weekend");
    expect(parsed.distance).toBe("surroundings");
    expect(parsed.weatherGoal).toBe("best");
    expect(parsed.mode).toBe("driving");
  });

  it("coerces lat/lon and radiusKm", () => {
    const parsed = discoverQuerySchema.parse({
      lat: "60.17",
      lon: "24.94",
      radiusKm: "250",
      datePreset: "custom",
      startDate: "2026-07-26",
      endDate: "2026-07-28",
      weatherGoal: "sun",
    });
    expect(parsed.lat).toBe(60.17);
    expect(parsed.lon).toBe(24.94);
    expect(parsed.radiusKm).toBe(250);
    expect(parsed.startDate).toBe("2026-07-26");
  });

  it("rejects invalid date strings", () => {
    expect(() =>
      discoverQuerySchema.parse({ startDate: "26-07-2026" }),
    ).toThrow();
  });
});

describe("routeQuerySchema", () => {
  it("requires from and to", () => {
    expect(() => routeQuerySchema.parse({})).toThrow();
    const parsed = routeQuerySchema.parse({ from: "Helsinki", to: "Tampere" });
    expect(parsed.mode).toBe("driving");
    expect(parsed.datePreset).toBe("weekend");
  });
});

describe("searchQuerySchema", () => {
  it("defaults mode and limit", () => {
    const parsed = searchQuerySchema.parse({ q: "Hel" });
    expect(parsed.mode).toBe("precise");
    expect(parsed.limit).toBe(5);
  });
});
