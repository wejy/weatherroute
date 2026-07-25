import "server-only";

import type { WeatherDto, DailyForecastDto } from "@/lib/types";
import {
  conditionFromCode,
  uvLabel,
} from "@/server/integrations/mocks/data";
import type { WeatherProvider } from "./types";

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    precipitation_probability?: number;
    cloud_cover: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum?: number[];
    cloud_cover_mean?: number[];
    uv_index_max?: number[];
  };
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const openMeteoProvider: WeatherProvider = {
  name: "open-meteo",
  async getForecast({ lat, lon, name }) {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current:
        "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,cloud_cover",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,cloud_cover_mean",
      timezone: "auto",
      forecast_days: "16",
    });

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      { next: { revalidate: 600 } },
    );

    if (!res.ok) {
      throw new Error(`Open-Meteo error: ${res.status}`);
    }

    const data = (await res.json()) as OpenMeteoResponse;
    const current = data.current;
    if (!current || !data.daily) {
      throw new Error("Open-Meteo returned incomplete payload");
    }

    const currentCondition = conditionFromCode(current.weather_code);
    const uv = data.daily.uv_index_max?.[0] ?? 3;

    const daily: DailyForecastDto[] = data.daily.time.map((date, i) => {
      const { condition, label } = conditionFromCode(
        data.daily!.weather_code[i] ?? 3,
      );
      return {
        date,
        dayLabel: DAY_LABELS[new Date(date).getDay()] ?? date,
        tempMaxC: data.daily!.temperature_2m_max[i] ?? 0,
        tempMinC: data.daily!.temperature_2m_min[i] ?? 0,
        precipitationProbability:
          data.daily!.precipitation_probability_max[i] ?? 0,
        precipitationMm:
          data.daily!.precipitation_sum?.[i] != null
            ? Math.round((data.daily!.precipitation_sum[i] ?? 0) * 10) / 10
            : undefined,
        cloudCover: data.daily!.cloud_cover_mean?.[i] ?? 40,
        condition,
        conditionLabel: label,
      };
    });

    const placeName = name ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

    const dto: WeatherDto = {
      place: {
        id: `${lat.toFixed(3)},${lon.toFixed(3)}`,
        name: placeName.split(",")[0]?.trim() || placeName,
        placeName,
        lat,
        lon,
      },
      provider: "open-meteo",
      fetchedAt: new Date().toISOString(),
      current: {
        temperatureC: current.temperature_2m,
        feelsLikeC: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeedKmh: current.wind_speed_10m,
        visibilityKm: 10,
        uvIndex: uv,
        uvLabel: uvLabel(uv),
        condition: currentCondition.condition,
        conditionLabel: currentCondition.label,
        precipitationProbability:
          daily[0]?.precipitationProbability ?? 10,
        cloudCover: current.cloud_cover,
      },
      daily,
    };

    return dto;
  },
};
