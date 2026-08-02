import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { eq, gt } from "drizzle-orm";
import type { WeatherDto } from "@/lib/types";
import { getDb } from "@/db";
import { weatherCache } from "@/db/schema";

const log = createModuleLogger("server.dal.weather-cache");
const DB_TTL_MS = 8 * 60 * 60 * 1000; // 8h

export function weatherGridKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export async function readWeatherCache(
  lat: number,
  lon: number,
): Promise<WeatherDto | null> {
  const db = getDb();
  if (!db) return null;

  const key = weatherGridKey(lat, lon);
  try {
    const [row] = await db
      .select()
      .from(weatherCache)
      .where(eq(weatherCache.cacheKey, key))
      .limit(1);

    if (!row) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;
    const payload = row.payload as WeatherDto;
    // Hourly was added for route dryness — treat pre-hourly rows as a miss.
    if (!payload.hourly?.length) return null;
    // Hourly precipitation mm added for route waypoints — refetch if missing.
    if (!payload.hourly.some((h) => h.precipitationMm != null)) return null;
    return payload;
  } catch (error) {
    log.warn({ err: error }, "[weather-cache] read failed");
    return null;
  }
}

export async function writeWeatherCache(
  result: WeatherDto,
  provider: string,
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const key = weatherGridKey(result.place.lat, result.place.lon);
  const expiresAt = new Date(Date.now() + DB_TTL_MS);

  try {
    await db
      .insert(weatherCache)
      .values({
        cacheKey: key,
        latitude: result.place.lat,
        longitude: result.place.lon,
        provider,
        payload: result,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: weatherCache.cacheKey,
        set: {
          latitude: result.place.lat,
          longitude: result.place.lon,
          provider,
          payload: result,
          expiresAt,
        },
      });
  } catch (error) {
    log.warn({ err: error }, "[weather-cache] write failed");
  }
}

/** Count non-expired cache rows (for warm job diagnostics). */
export async function countFreshWeatherCache(): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  try {
    const rows = await db
      .select({ id: weatherCache.id })
      .from(weatherCache)
      .where(gt(weatherCache.expiresAt, new Date()))
      .limit(1000);
    return rows.length;
  } catch {
    return 0;
  }
}
