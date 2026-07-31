import "server-only";

import type {
  WeatherDto,
  DailyForecastDto,
  HourlyForecastDto,
} from "@/lib/types";
import { uvLabel } from "@/server/integrations/mocks/data";
import type { WeatherProvider } from "./types";
import { weekdayShort, toDateKey } from "@/lib/dates";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildHourly(
  baseTemp: number,
  seed: number,
): HourlyForecastDto[] {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return Array.from({ length: 48 }, (_, i) => {
    const t = new Date(now.getTime() + i * 60 * 60 * 1000);
    const precip = (seed + i * 11) % 55;
    const cond =
      precip >= 45
        ? ("rainy" as const)
        : precip >= 25
          ? ("cloudy" as const)
          : precip >= 15
            ? ("partly_cloudy" as const)
            : ("sunny" as const);
    const label =
      cond === "rainy"
        ? "Rainy"
        : cond === "cloudy"
          ? "Cloudy"
          : cond === "partly_cloudy"
            ? "Partly cloudy"
            : "Sunny";
    return {
      time: `${toDateKey(t)}T${pad(t.getHours())}:00`,
      temperatureC: baseTemp - Math.round(Math.sin(i / 4) * 3),
      precipitationProbability: precip,
      precipitationMm:
        Math.round(((precip / 100) * (0.2 + (seed % 7) / 10)) * 10) / 10,
      cloudCover: 20 + ((seed + i * 3) % 60),
      condition: cond,
      conditionLabel: label,
    };
  });
}

export const mockWeatherProvider: WeatherProvider = {
  name: "mock",
  async getForecast({ lat, lon, name }) {
    const placeName = name ?? "Mock Location";
    const isTurku = placeName.toLowerCase().includes("turku");
    const baseTemp = isTurku ? 21 : 18 + Math.round((lat % 5) + (lon % 3));
    const seed = Math.abs(Math.round(lat * 10 + lon * 3));

    const patterns = [
      { precip: 20, cloud: 40, mm: 0.4, cond: "partly_cloudy" as const, label: "Partly cloudy" },
      { precip: 15, cloud: 30, mm: 0, cond: "sunny" as const, label: "Sunny" },
      { precip: 60, cloud: 90, mm: 6.2, cond: "rainy" as const, label: "Rainy" },
      { precip: 10, cloud: 20, mm: 0, cond: "sunny" as const, label: "Sunny" },
      { precip: 5, cloud: 15, mm: 0, cond: "sunny" as const, label: "Sunny" },
      { precip: 30, cloud: 50, mm: 1.5, cond: "partly_cloudy" as const, label: "Partly cloudy" },
      { precip: 50, cloud: 60, mm: 3.8, cond: "cloudy" as const, label: "Cloudy" },
    ];

    const days: DailyForecastDto[] = Array.from({ length: 16 }, (_, i) => {
      const d = patterns[i % patterns.length]!;
      const date = new Date();
      date.setDate(date.getDate() + i);
      const key = toDateKey(date);
      return {
        date: key,
        dayLabel: weekdayShort(key, "en"),
        tempMaxC: baseTemp + (i % 3),
        tempMinC: baseTemp - 5,
        precipitationProbability: d.precip,
        precipitationMm: d.mm,
        cloudCover: d.cloud,
        condition: d.cond,
        conditionLabel: d.label,
      };
    });

    const hourly = buildHourly(baseTemp, seed);

    const dto: WeatherDto = {
      place: {
        id: `mock-${lat.toFixed(3)},${lon.toFixed(3)}`,
        name: placeName.split(",")[0]?.trim() || placeName,
        placeName,
        lat,
        lon,
      },
      provider: "mock",
      fetchedAt: new Date().toISOString(),
      current: {
        temperatureC: baseTemp,
        feelsLikeC: baseTemp - 3,
        humidity: 64,
        windSpeedKmh: 12,
        visibilityKm: 10,
        uvIndex: 5,
        uvLabel: uvLabel(5),
        condition: "partly_cloudy",
        conditionLabel: "Scattered Clouds",
        precipitationProbability: hourly[0]?.precipitationProbability ?? 20,
        cloudCover: 40,
      },
      daily: days,
      hourly,
    };

    return dto;
  },
};
