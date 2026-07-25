import "server-only";

import { env } from "@/lib/env";
import type { WeatherDto } from "@/lib/types";
import { mockWeatherProvider } from "./mock";
import { openMeteoProvider } from "./openmeteo";
import { yrProvider } from "./yr";
import type { WeatherProvider } from "./types";

const memoryCache = new Map<string, { expiresAt: number; value: WeatherDto }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKey(lat: number, lon: number) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
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
    // Open-Meteo needs no API key; fall back to yr stub then pure mock.
    try {
      result = await withFallback(openMeteoProvider, yrProvider, input);
    } catch {
      result = await mockWeatherProvider.getForecast(input);
    }
  }

  memoryCache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
