import "server-only";

import { env } from "@/lib/env";
import type { WeatherDto } from "@/lib/types";
import { mockWeatherProvider } from "./mock";
import { openMeteoForecastBatch, openMeteoProvider } from "./openmeteo";
import { yrProvider } from "./yr";
import type { WeatherProvider } from "./types";

const memoryCache = new Map<string, { expiresAt: number; value: WeatherDto }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKey(lat: number, lon: number) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function remember(result: WeatherDto) {
  memoryCache.set(cacheKey(result.place.lat, result.place.lon), {
    value: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function withFallback(
  primary: WeatherProvider,
  fallback: WeatherProvider,
  input: { lat: number; lon: number; name?: string },
): Promise<WeatherDto> {
  try {
    return await primary.getForecast(input);
  } catch (error) {
    console.warn(`[weather] ${primary.name} failed, trying ${fallback.name}`, error);
    return fallback.getForecast(input);
  }
}

export async function fetchWeather(input: {
  lat: number;
  lon: number;
  name?: string;
}): Promise<WeatherDto> {
  const key = cacheKey(input.lat, input.lon);
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let result: WeatherDto;

  if (env.useMockWeather) {
    result = await mockWeatherProvider.getForecast(input);
  } else {
    try {
      result = await withFallback(openMeteoProvider, yrProvider, input);
    } catch {
      result = await mockWeatherProvider.getForecast(input);
    }
  }

  remember(result);
  return result;
}

/**
 * Fetch many forecasts: cache hits first, then one Open-Meteo batch for misses.
 * Returns results aligned with `places` (null if that location failed).
 */
export async function fetchWeatherBatch(
  places: Array<{ lat: number; lon: number; name?: string }>,
): Promise<Array<WeatherDto | null>> {
  if (places.length === 0) return [];

  const results: Array<WeatherDto | null> = new Array(places.length).fill(null);
  const missing: Array<{
    index: number;
    lat: number;
    lon: number;
    name?: string;
  }> = [];

  for (let i = 0; i < places.length; i++) {
    const place = places[i]!;
    const cached = memoryCache.get(cacheKey(place.lat, place.lon));
    if (cached && cached.expiresAt > Date.now()) {
      results[i] = cached.value;
    } else {
      missing.push({ index: i, ...place });
    }
  }

  if (missing.length === 0) return results;

  if (env.useMockWeather) {
    await Promise.all(
      missing.map(async (m) => {
        try {
          const w = await mockWeatherProvider.getForecast(m);
          remember(w);
          results[m.index] = w;
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
        remember(aligned);
        results[m.index] = aligned;
      } else {
        results[m.index] = null;
      }
    }
  } catch (error) {
    console.warn("[weather] batch failed, falling back per-place", error);
    await Promise.all(
      missing.map(async (m) => {
        try {
          const w = await withFallback(openMeteoProvider, yrProvider, m);
          remember(w);
          results[m.index] = w;
        } catch {
          try {
            const w = await mockWeatherProvider.getForecast(m);
            remember(w);
            results[m.index] = w;
          } catch {
            results[m.index] = null;
          }
        }
      }),
    );
  }

  return results;
}
