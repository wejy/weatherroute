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

/** yr.no fallback stub — returns deterministic mock shaped like a real provider. */
export const yrProvider: WeatherProvider = {
  name: "yr.no",
  async getForecast({ lat, lon, name }) {
    const seed = Math.abs(Math.round(lat * 10 + lon));
    const baseTemp = 12 + (seed % 12);
    const placeName = name ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const days: DailyForecastDto[] = Array.from({ length: 16 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const key = toDateKey(date);
      return {
        date: key,
        dayLabel: weekdayShort(key, "en"),
        tempMaxC: baseTemp + 2 - (i % 3),
        tempMinC: baseTemp - 4,
        precipitationProbability: (seed + i * 7) % 40,
        precipitationMm:
          Math.round((((seed + i * 7) % 40) / 40) * 8 * 10) / 10,
        cloudCover: 30 + ((seed + i * 5) % 50),
        condition: i % 3 === 0 ? "sunny" : i % 3 === 1 ? "partly_cloudy" : "cloudy",
        conditionLabel:
          i % 3 === 0 ? "Sunny" : i % 3 === 1 ? "Partly cloudy" : "Cloudy",
      };
    });

    const now = new Date();
    now.setMinutes(0, 0, 0);
    const hourly: HourlyForecastDto[] = Array.from({ length: 48 }, (_, i) => {
      const t = new Date(now.getTime() + i * 60 * 60 * 1000);
      const precip = (seed + i * 9) % 45;
      return {
        time: `${toDateKey(t)}T${pad(t.getHours())}:00`,
        temperatureC: baseTemp - (i % 5),
        precipitationProbability: precip,
        cloudCover: 30 + ((seed + i) % 50),
        condition: precip > 35 ? "rainy" : precip > 20 ? "cloudy" : "partly_cloudy",
        conditionLabel:
          precip > 35 ? "Rainy" : precip > 20 ? "Cloudy" : "Partly cloudy",
      };
    });

    const dto: WeatherDto = {
      place: {
        id: `yr-${lat.toFixed(3)},${lon.toFixed(3)}`,
        name: placeName.split(",")[0]?.trim() || placeName,
        placeName,
        lat,
        lon,
      },
      provider: "yr.no",
      fetchedAt: new Date().toISOString(),
      current: {
        temperatureC: baseTemp,
        feelsLikeC: baseTemp - 1,
        humidity: 55 + (seed % 30),
        windSpeedKmh: 8 + (seed % 15),
        visibilityKm: 10,
        uvIndex: 4,
        uvLabel: uvLabel(4),
        condition: "partly_cloudy",
        conditionLabel: "Partly cloudy",
        precipitationProbability: hourly[0]?.precipitationProbability ?? 15,
        cloudCover: 45,
      },
      daily: days,
      hourly,
    };

    return dto;
  },
};
