import "server-only";

import type {
  WeatherDto,
  DailyForecastDto,
  HourlyForecastDto,
} from "@/lib/types";
import {
  conditionFromCode,
  uvLabel,
} from "@/server/integrations/mocks/data";
import type { WeatherProvider } from "./types";
import { weekdayShort } from "@/lib/dates";
import { recordUsageEvent } from "@/server/dal/usage";
import { USAGE_TYPES } from "@/server/dal/usage-types";
import {
  env,
  getOpenMeteoForecastBaseUrl,
  hasOpenMeteoCommercial,
} from "@/lib/env";

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone?: string;
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    precipitation_probability?: number;
    cloud_cover: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation?: number[];
    weather_code: number[];
    cloud_cover: number[];
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

function mapHourly(data: OpenMeteoResponse): HourlyForecastDto[] {
  const hourly = data.hourly;
  if (!hourly?.time?.length) return [];

  // Align with daily chart horizon (Open-Meteo hourly up to 16d).
  const limit = Math.min(hourly.time.length, 16 * 24);
  const out: HourlyForecastDto[] = [];
  for (let i = 0; i < limit; i++) {
    const code = hourly.weather_code[i] ?? 3;
    const { condition, label } = conditionFromCode(code);
    out.push({
      time: hourly.time[i]!,
      temperatureC: Math.round(hourly.temperature_2m[i] ?? 0),
      precipitationProbability: hourly.precipitation_probability[i] ?? 0,
      precipitationMm:
        hourly.precipitation?.[i] != null
          ? Math.round((hourly.precipitation[i] ?? 0) * 10) / 10
          : undefined,
      cloudCover: hourly.cloud_cover[i] ?? 40,
      condition,
      conditionLabel: label,
    });
  }
  return out;
}

function toWeatherDto(
  data: OpenMeteoResponse,
  name?: string,
): WeatherDto {
  const current = data.current;
  if (!current || !data.daily) {
    throw new Error("Open-Meteo returned incomplete payload");
  }

  const currentCondition = conditionFromCode(current.weather_code);
  const uv = data.daily.uv_index_max?.[0] ?? 3;
  const hourly = mapHourly(data);

  const daily: DailyForecastDto[] = data.daily.time.map((date, i) => {
    const { condition, label } = conditionFromCode(
      data.daily!.weather_code[i] ?? 3,
    );
    return {
      date,
      // EN placeholder; localizeDayLabels(locale) applied before UI.
      dayLabel: weekdayShort(date, "en"),
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

  const lat = data.latitude;
  const lon = data.longitude;
  const placeName = name ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

  const currentPrecip =
    current.precipitation_probability ??
    hourly[0]?.precipitationProbability ??
    daily[0]?.precipitationProbability ??
    10;

  return {
    place: {
      id: `${lat.toFixed(3)},${lon.toFixed(3)}`,
      name: placeName.split(",")[0]?.trim() || placeName,
      placeName,
      lat,
      lon,
    },
    provider: "open-meteo",
    fetchedAt: new Date().toISOString(),
    timezone: data.timezone,
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
      precipitationProbability: currentPrecip,
      cloudCover: current.cloud_cover,
    },
    daily,
    hourly,
  };
}

function forecastParams(
  latitudes: number[],
  longitudes: number[],
): URLSearchParams {
  const params = new URLSearchParams({
    latitude: latitudes.map(String).join(","),
    longitude: longitudes.map(String).join(","),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,cloud_cover",
    hourly:
      "temperature_2m,precipitation_probability,precipitation,weather_code,cloud_cover",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,cloud_cover_mean",
    timezone: "auto",
    forecast_days: "16",
    forecast_hours: "168",
  });
  if (hasOpenMeteoCommercial()) {
    params.set("apikey", env.openMeteoApiKey);
  }
  return params;
}

function forecastFetchInit(): RequestInit & { next: { revalidate: number } } {
  const headers: Record<string, string> = { Accept: "application/json" };
  // Prefer header auth when commercial (also send apikey query per Open-Meteo docs).
  if (hasOpenMeteoCommercial()) {
    headers["X-Api-Key"] = env.openMeteoApiKey;
  }
  return {
    headers,
    next: { revalidate: 600 },
  };
}

function forecastUrl(params: URLSearchParams): string {
  return `${getOpenMeteoForecastBaseUrl()}/v1/forecast?${params}`;
}

export const openMeteoProvider: WeatherProvider = {
  name: "open-meteo",
  async getForecast({ lat, lon, name }) {
    const params = forecastParams([lat], [lon]);
    const res = await fetch(forecastUrl(params), forecastFetchInit());

    if (!res.ok) {
      throw new Error(`Open-Meteo error: ${res.status}`);
    }
    recordUsageEvent({
      type: USAGE_TYPES.extOpenMeteo,
      meta: {
        locations: 1,
        commercial: hasOpenMeteoCommercial(),
      },
    });

    const data = (await res.json()) as OpenMeteoResponse;
    return toWeatherDto(data, name);
  },
};

/**
 * Batch forecast for many coordinates in one HTTP call.
 * Open-Meteo returns an array when multiple lat/lon pairs are requested.
 */
export async function openMeteoForecastBatch(
  places: Array<{ lat: number; lon: number; name?: string }>,
): Promise<Array<WeatherDto | null>> {
  if (places.length === 0) return [];
  if (places.length === 1) {
    try {
      const w = await openMeteoProvider.getForecast(places[0]!);
      return [w];
    } catch {
      return [null];
    }
  }

  const params = forecastParams(
    places.map((p) => p.lat),
    places.map((p) => p.lon),
  );
  const res = await fetch(forecastUrl(params), forecastFetchInit());
  if (!res.ok) {
    throw new Error(`Open-Meteo batch error: ${res.status}`);
  }
  recordUsageEvent({
    type: USAGE_TYPES.extOpenMeteo,
    meta: {
      locations: places.length,
      commercial: hasOpenMeteoCommercial(),
    },
  });

  const raw = (await res.json()) as OpenMeteoResponse | OpenMeteoResponse[];
  const rows = Array.isArray(raw) ? raw : [raw];

  return places.map((place, i) => {
    const row = rows[i];
    if (!row) return null;
    try {
      return toWeatherDto(row, place.name);
    } catch {
      return null;
    }
  });
}
