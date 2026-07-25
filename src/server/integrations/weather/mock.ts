import "server-only";

import type { WeatherDto, DailyForecastDto } from "@/lib/types";
import { uvLabel } from "@/server/integrations/mocks/data";
import type { WeatherProvider } from "./types";

export const mockWeatherProvider: WeatherProvider = {
  name: "mock",
  async getForecast({ lat, lon, name }) {
    const placeName = name ?? "Mock Location";
    const isTurku = placeName.toLowerCase().includes("turku");
    const baseTemp = isTurku ? 21 : 18 + Math.round((lat % 5) + (lon % 3));

    const patterns = [
      { precip: 20, cloud: 40, cond: "partly_cloudy" as const, label: "Partly cloudy" },
      { precip: 15, cloud: 30, cond: "sunny" as const, label: "Sunny" },
      { precip: 60, cloud: 90, cond: "rainy" as const, label: "Rainy" },
      { precip: 10, cloud: 20, cond: "sunny" as const, label: "Sunny" },
      { precip: 5, cloud: 15, cond: "sunny" as const, label: "Sunny" },
      { precip: 30, cloud: 50, cond: "partly_cloudy" as const, label: "Partly cloudy" },
      { precip: 50, cloud: 60, cond: "cloudy" as const, label: "Cloudy" },
    ];

    const days: DailyForecastDto[] = Array.from({ length: 16 }, (_, i) => {
      const d = patterns[i % patterns.length]!;
      const date = new Date();
      date.setDate(date.getDate() + i);
      return {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        dayLabel: date.toLocaleDateString("en", { weekday: "short" }),
        tempMaxC: baseTemp + (i % 3),
        tempMinC: baseTemp - 5,
        precipitationProbability: d.precip,
        cloudCover: d.cloud,
        condition: d.cond,
        conditionLabel: d.label,
      };
    });

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
        precipitationProbability: 20,
        cloudCover: 40,
      },
      daily: days,
    };

    return dto;
  },
};
