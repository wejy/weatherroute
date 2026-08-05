import {
  hourInDepartureWindow,
  normalizeDepartureWindow,
  parseDepartureHourParam,
} from "@/lib/departure";
import { routeQuerySchema } from "@/lib/validation/schemas";
import {
  findBestDeparture,
  hourOfLocalKey,
  type CorridorSample,
} from "@/server/services/route-corridor";
import type { WeatherDto } from "@/lib/types";

describe("parseDepartureHourParam", () => {
  it("accepts 0–23 and rejects invalid", () => {
    expect(parseDepartureHourParam(8)).toBe(8);
    expect(parseDepartureHourParam("0")).toBe(0);
    expect(parseDepartureHourParam("23")).toBe(23);
    expect(parseDepartureHourParam("any")).toBeNull();
    expect(parseDepartureHourParam("")).toBeNull();
    expect(parseDepartureHourParam(null)).toBeNull();
    expect(parseDepartureHourParam(24)).toBeNull();
    expect(parseDepartureHourParam(-1)).toBeNull();
  });
});

describe("normalizeDepartureWindow", () => {
  it("keeps nulls as any", () => {
    expect(normalizeDepartureWindow(null, null)).toEqual({
      ok: true,
      window: { startHour: null, endHour: null },
    });
  });

  it("allows only start or only end", () => {
    expect(normalizeDepartureWindow(8, null)).toEqual({
      ok: true,
      window: { startHour: 8, endHour: null },
    });
    expect(normalizeDepartureWindow(null, 15)).toEqual({
      ok: true,
      window: { startHour: null, endHour: 15 },
    });
  });

  it("allows equal start and end", () => {
    expect(normalizeDepartureWindow(10, 10)).toEqual({
      ok: true,
      window: { startHour: 10, endHour: 10 },
    });
  });

  it("rejects start after end", () => {
    expect(normalizeDepartureWindow(16, 8)).toEqual({
      ok: false,
      error: "start_after_end",
    });
  });
});

describe("hourInDepartureWindow", () => {
  it("filters by start, end, both, or neither", () => {
    expect(hourInDepartureWindow(5, null, null)).toBe(true);
    expect(hourInDepartureWindow(7, 8, null)).toBe(false);
    expect(hourInDepartureWindow(8, 8, null)).toBe(true);
    expect(hourInDepartureWindow(23, 8, null)).toBe(true);
    expect(hourInDepartureWindow(16, null, 15)).toBe(false);
    expect(hourInDepartureWindow(15, null, 15)).toBe(true);
    expect(hourInDepartureWindow(0, null, 15)).toBe(true);
    expect(hourInDepartureWindow(7, 8, 15)).toBe(false);
    expect(hourInDepartureWindow(12, 8, 15)).toBe(true);
    expect(hourInDepartureWindow(16, 8, 15)).toBe(false);
  });
});

describe("routeQuerySchema departure window", () => {
  it("accepts start/end and maps legacy earliestHour", () => {
    const mapped = routeQuerySchema.parse({
      from: "A",
      to: "B",
      earliestHour: "9",
    });
    expect(mapped.departureStartHour).toBe(9);

    const both = routeQuerySchema.parse({
      from: "A",
      to: "B",
      departureStartHour: "8",
      departureEndHour: "15",
    });
    expect(both.departureStartHour).toBe(8);
    expect(both.departureEndHour).toBe(15);
  });

  it("rejects start after end", () => {
    const result = routeQuerySchema.safeParse({
      from: "A",
      to: "B",
      departureStartHour: "16",
      departureEndHour: "8",
    });
    expect(result.success).toBe(false);
  });
});

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Far-future day so “now” filter does not drop candidates. */
const FIXTURE_DAY = "2099-06-15";

function hourlyForDay(
  rainByHour: Partial<Record<number, number>>,
): NonNullable<WeatherDto["hourly"]> {
  return Array.from({ length: 24 }, (_, h) => ({
    time: `${FIXTURE_DAY}T${pad(h)}:00`,
    temperatureC: 18,
    precipitationProbability: rainByHour[h] ?? 80,
    cloudCover: 40,
    condition: "cloudy" as const,
    conditionLabel: "Cloudy",
  }));
}

function sampleWithHourly(
  rainByHour: Partial<Record<number, number>>,
): CorridorSample[] {
  const weather: WeatherDto = {
    place: {
      id: "origin",
      name: "Origin",
      placeName: "Origin",
      lat: 60,
      lon: 25,
      country: "FI",
    },
    provider: "mock",
    fetchedAt: `${FIXTURE_DAY}T00:00:00Z`,
    timezone: "UTC",
    current: {
      temperatureC: 18,
      feelsLikeC: 17,
      humidity: 60,
      windSpeedKmh: 10,
      visibilityKm: 10,
      uvIndex: 3,
      uvLabel: "Moderate",
      condition: "cloudy",
      conditionLabel: "Cloudy",
      precipitationProbability: 20,
      cloudCover: 40,
    },
    daily: [
      {
        date: FIXTURE_DAY,
        dayLabel: "Mon",
        tempMinC: 12,
        tempMaxC: 20,
        precipitationProbability: 40,
        condition: "cloudy",
        conditionLabel: "Cloudy",
        cloudCover: 40,
      },
    ],
    hourly: hourlyForDay(rainByHour),
  };

  return [
    {
      name: "Origin",
      role: "start",
      lat: 60,
      lon: 25,
      t: 0,
      weather,
    },
  ];
}

describe("findBestDeparture departure window", () => {
  // Driest hour outside typical window is 6 (rain 5); inside 8–15 the driest is 12 (rain 10).
  const rainByHour = {
    6: 5,
    12: 10,
    18: 15,
  };

  it("keeps best hour inside start–end", () => {
    const best = findBestDeparture(sampleWithHourly(rainByHour), 1, {
      startHour: 8,
      endHour: 15,
      startDate: FIXTURE_DAY,
      endDate: FIXTURE_DAY,
      timeZone: "UTC",
    });
    const h = hourOfLocalKey(best.departureTime);
    expect(h).toBeGreaterThanOrEqual(8);
    expect(h).toBeLessThanOrEqual(15);
    expect(h).toBe(12);
  });

  it("only start floors the window", () => {
    const best = findBestDeparture(sampleWithHourly(rainByHour), 1, {
      startHour: 8,
      endHour: null,
      startDate: FIXTURE_DAY,
      endDate: FIXTURE_DAY,
      timeZone: "UTC",
    });
    const h = hourOfLocalKey(best.departureTime);
    expect(h).toBeGreaterThanOrEqual(8);
    expect(h).toBe(12);
  });

  it("only end caps the window", () => {
    const best = findBestDeparture(sampleWithHourly({ 6: 5, 12: 90, 18: 90 }), 1, {
      startHour: null,
      endHour: 15,
      startDate: FIXTURE_DAY,
      endDate: FIXTURE_DAY,
      timeZone: "UTC",
    });
    const h = hourOfLocalKey(best.departureTime);
    expect(h).toBeLessThanOrEqual(15);
    expect(h).toBe(6);
  });

  it("null window can pick early driest hour", () => {
    const best = findBestDeparture(sampleWithHourly(rainByHour), 1, {
      startHour: null,
      endHour: null,
      startDate: FIXTURE_DAY,
      endDate: FIXTURE_DAY,
      timeZone: "UTC",
    });
    expect(hourOfLocalKey(best.departureTime)).toBe(6);
  });

  it("does not throw when window filters out all future hours", () => {
    const best = findBestDeparture(sampleWithHourly({}), 1, {
      startHour: 22,
      endHour: 23,
      startDate: FIXTURE_DAY,
      endDate: FIXTURE_DAY,
      timeZone: "UTC",
      horizonHours: 24,
    });
    expect(best.departureTime).toBeTruthy();
  });
});
