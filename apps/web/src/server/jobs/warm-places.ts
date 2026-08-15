import "server-only";

import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { places, usageEvents } from "@/db/schema";
import { weatherGridKey } from "@/server/dal/weather-cache";
import { USAGE_TYPES } from "@/server/dal/usage-types";
import {
  mergeWarmCandidates,
  type WarmPlace,
  type WarmPlaceSelection,
} from "@/server/jobs/warm-places-merge";

export type { WarmPlace, WarmPlaceSelection };
export { mergeWarmCandidates };

const NORDIC_BALTIC = ["FI", "SE", "NO", "DK", "EE", "LV", "LT"] as const;
const USAGE_LOOKBACK_DAYS = 14;
const USAGE_CAP = 150;
const REGIONAL_NORDIC_CAP = 200;
const REGIONAL_DE_CAP = 50;

function parseMetaCoord(meta: unknown): { lat: number; lon: number } | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const lat = typeof m.lat === "number" ? m.lat : Number(m.lat);
  const lon = typeof m.lon === "number" ? m.lon : Number(m.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

async function loadUsageWarmPlaces(cap: number): Promise<WarmPlace[]> {
  const db = getDb();
  if (!db) return [];

  const since = new Date(
    Date.now() - USAGE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );
  const rows = await db
    .select({ meta: usageEvents.meta })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.type, USAGE_TYPES.discover),
        gt(usageEvents.createdAt, since),
      ),
    )
    .limit(5000);

  const hits = new Map<string, { lat: number; lon: number; count: number }>();
  for (const row of rows) {
    const coords = parseMetaCoord(row.meta);
    if (!coords) continue;
    const key = weatherGridKey(coords.lat, coords.lon);
    const prev = hits.get(key);
    if (prev) {
      prev.count += 1;
    } else {
      hits.set(key, { lat: coords.lat, lon: coords.lon, count: 1 });
    }
  }

  return [...hits.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, cap)
    .map((h) => ({
      lat: h.lat,
      lon: h.lon,
      name: `usage:${weatherGridKey(h.lat, h.lon)}`,
      source: "usage" as const,
    }));
}

async function loadRegionalWarmPlaces(): Promise<WarmPlace[]> {
  const db = getDb();
  if (!db) return [];

  const nordic = await db
    .select({
      lat: places.lat,
      lon: places.lon,
      name: places.placeName,
    })
    .from(places)
    .where(inArray(places.countryCode, [...NORDIC_BALTIC]))
    .orderBy(desc(places.population))
    .limit(REGIONAL_NORDIC_CAP);

  const de = await db
    .select({
      lat: places.lat,
      lon: places.lon,
      name: places.placeName,
    })
    .from(places)
    .where(eq(places.countryCode, "DE"))
    .orderBy(desc(places.population))
    .limit(REGIONAL_DE_CAP);

  return [
    ...nordic.map((r) => ({
      lat: r.lat,
      lon: r.lon,
      name: r.name,
      source: "regional" as const,
    })),
    ...de.map((r) => ({
      lat: r.lat,
      lon: r.lon,
      name: r.name,
      source: "regional" as const,
    })),
  ];
}

async function loadGlobalWarmPlaces(limit: number): Promise<WarmPlace[]> {
  const db = getDb();
  if (!db || limit <= 0) return [];

  const rows = await db
    .select({
      lat: places.lat,
      lon: places.lon,
      name: places.placeName,
    })
    .from(places)
    .orderBy(desc(places.population))
    .limit(limit);

  return rows.map((r) => ({
    lat: r.lat,
    lon: r.lon,
    name: r.name,
    source: "global" as const,
  }));
}

/**
 * Hybrid warm set: recent discover origins → Nordic/Baltic+DE population →
 * global population fill, capped at `limit`.
 */
export async function selectWarmPlaces(
  limit: number,
): Promise<WarmPlaceSelection> {
  const db = getDb();
  if (!db) {
    return {
      places: [],
      counts: { usage: 0, regional: 0, global: 0, total: 0 },
    };
  }

  const capped = Math.max(1, Math.min(2000, Math.floor(limit)));
  const [usage, regional] = await Promise.all([
    loadUsageWarmPlaces(USAGE_CAP),
    loadRegionalWarmPlaces(),
  ]);

  const global = await loadGlobalWarmPlaces(capped);

  return mergeWarmCandidates(usage, regional, global, capped);
}

/** Diagnostics helper — place count in DB. */
export async function countPlacesApprox(): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(places);
    return Number(row?.count ?? 0);
  } catch {
    return 0;
  }
}
