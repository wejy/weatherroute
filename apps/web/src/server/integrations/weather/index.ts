import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { env } from "@/lib/env";
import type { WeatherDto } from "@/lib/types";
import { localizeDayLabels, type DateLocale } from "@/lib/dates";
import {
  getDictionary,
  translateCondition,
  translateUv,
} from "@solviax/i18n";
import {
  readWeatherCache,
  writeWeatherCache,
  weatherGridKey,
} from "@/server/dal/weather-cache";
import { mockWeatherProvider } from "./mock";
import { openMeteoForecastBatch, openMeteoProvider } from "./openmeteo";
import { yrProvider } from "./yr";
import type { WeatherProvider } from "./types";

const log = createModuleLogger("server.integrations.weather");
const memoryCache = new Map<string, { expiresAt: number; value: WeatherDto }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function remember(result: WeatherDto, provider = "open-meteo") {
  memoryCache.set(weatherGridKey(result.place.lat, result.place.lon), {
    value: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  void writeWeatherCache(result, provider);
}

function forLocale(result: WeatherDto, locale: DateLocale = "en"): WeatherDto {
  const withDays = localizeDayLabels(result, locale);
  const dict = getDictionary(locale);
  return {
    ...withDays,
    current: {
      ...withDays.current,
      conditionLabel: translateCondition(dict, withDays.current.condition),
      uvLabel: translateUv(dict, withDays.current.uvIndex),
    },
    daily: withDays.daily.map((d) => ({
      ...d,
      conditionLabel: translateCondition(dict, d.condition),
    })),
    hourly: withDays.hourly?.map((h) => ({
      ...h,
      conditionLabel: translateCondition(dict, h.condition),
    })),
  };
}

async function withFallback(
  primary: WeatherProvider,
  fallback: WeatherProvider,
  input: { lat: number; lon: number; name?: string },
): Promise<WeatherDto> {
  try {
    return await primary.getForecast(input);
  } catch (error) {
    log.warn({ err: error }, `[weather] ${primary.name} failed, trying ${fallback.name}`);
    return fallback.getForecast(input);
  }
}

async function lookupCache(
  lat: number,
  lon: number,
): Promise<WeatherDto | null> {
  const key = weatherGridKey(lat, lon);
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    const hourly = mem.value.hourly;
    if (
      !hourly?.length ||
      !hourly.some((h) => h.precipitationMm != null)
    ) {
      memoryCache.delete(key);
    } else {
      return mem.value;
    }
  }

  const fromDb = await readWeatherCache(lat, lon);
  if (fromDb) {
    memoryCache.set(key, {
      value: fromDb,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return fromDb;
  }
  return null;
}

export async function fetchWeather(input: {
  lat: number;
  lon: number;
  name?: string;
  locale?: DateLocale;
}): Promise<WeatherDto> {
  const locale = input.locale ?? "en";
  const cached = await lookupCache(input.lat, input.lon);
  if (cached) return forLocale(cached, locale);

  let result: WeatherDto;
  let provider = "open-meteo";

  if (env.useMockWeather) {
    result = await mockWeatherProvider.getForecast(input);
    provider = "mock";
  } else {
    try {
      result = await withFallback(openMeteoProvider, yrProvider, input);
    } catch {
      result = await mockWeatherProvider.getForecast(input);
      provider = "mock";
    }
  }

  remember(result, provider);
  return forLocale(result, locale);
}

/**
 * Fetch many forecasts: memory + DB cache hits first, then Open-Meteo batch.
 */
export async function fetchWeatherBatch(
  places: Array<{ lat: number; lon: number; name?: string }>,
  locale: DateLocale = "en",
): Promise<Array<WeatherDto | null>> {
  if (places.length === 0) return [];

  const results: Array<WeatherDto | null> = new Array(places.length).fill(null);
  const missing: Array<{
    index: number;
    lat: number;
    lon: number;
    name?: string;
  }> = [];

  await Promise.all(
    places.map(async (place, i) => {
      const cached = await lookupCache(place.lat, place.lon);
      if (cached) {
        results[i] = forLocale(cached, locale);
      } else {
        missing.push({ index: i, ...place });
      }
    }),
  );

  if (missing.length === 0) return results;

  if (env.useMockWeather) {
    await Promise.all(
      missing.map(async (m) => {
        try {
          const w = await mockWeatherProvider.getForecast(m);
          remember(w, "mock");
          results[m.index] = forLocale(w, locale);
        } catch {
          results[m.index] = null;
        }
      }),
    );
    return results;
  }

  try {
    const batch = await openMeteoForecastBatch(missing);
    for (let j = 0; j < missing.length; j++) {
      const m = missing[j]!;
      const w = batch[j] ?? null;
      if (w) {
        const aligned: WeatherDto = {
          ...w,
          place: {
            ...w.place,
            lat: m.lat,
            lon: m.lon,
            placeName: m.name ?? w.place.placeName,
            name: m.name?.split(",")[0]?.trim() || w.place.name,
          },
        };
        remember(aligned, "open-meteo");
        results[m.index] = forLocale(aligned, locale);
      } else {
        results[m.index] = null;
      }
    }
  } catch (error) {
    log.warn({ err: error }, "[weather] batch failed, falling back per-place");
    await Promise.all(
      missing.map(async (m) => {
        try {
          const w = await withFallback(openMeteoProvider, yrProvider, m);
          remember(w, "open-meteo");
          results[m.index] = forLocale(w, locale);
        } catch {
          try {
            const w = await mockWeatherProvider.getForecast(m);
            remember(w, "mock");
            results[m.index] = forLocale(w, locale);
          } catch {
            results[m.index] = null;
          }
        }
      }),
    );
  }

  return results;
}
