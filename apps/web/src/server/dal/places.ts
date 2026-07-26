import { and, eq, gte, lte } from "drizzle-orm";
import { haversineKm } from "@/server/integrations/mocks/data";
import {
  CITY_INDEX,
  candidateRankScore,
  type CityIndexEntry,
} from "@/server/integrations/places/city-index";
import { getDb } from "@/db";
import { places } from "@/db/schema";

export type PlaceCandidate = CityIndexEntry & { distanceKm: number };

/**
 * Discover candidates: Postgres `places` when available, else CITY_INDEX.
 */
export async function placesWithinRadius(
  origin: { lat: number; lon: number },
  radiusKm: number,
  opts?: { excludeName?: string; limit?: number },
): Promise<PlaceCandidate[]> {
  const exclude = opts?.excludeName?.toLowerCase().trim();
  const limit = opts?.limit ?? 14;
  const db = getDb();

  if (db) {
    const latDelta = radiusKm / 111;
    const lonDelta =
      radiusKm / (111 * Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)));

    const rows = await db
      .select()
      .from(places)
      .where(
        and(
          gte(places.lat, origin.lat - latDelta),
          lte(places.lat, origin.lat + latDelta),
          gte(places.lon, origin.lon - lonDelta),
          lte(places.lon, origin.lon + lonDelta),
        ),
      )
      .limit(500);

    if (rows.length > 0) {
      return rows
        .map((row) => ({
          id: row.id,
          name: row.name,
          placeName: row.placeName,
          country: row.country ?? undefined,
          countryCode: row.countryCode ?? undefined,
          lat: row.lat,
          lon: row.lon,
          population: row.population,
          distanceKm: haversineKm(origin, { lat: row.lat, lon: row.lon }),
        }))
        .filter((city) => {
          if (city.distanceKm < 5) return false;
          if (exclude && city.name.toLowerCase() === exclude) return false;
          return city.distanceKm <= radiusKm;
        })
        .sort(
          (a, b) =>
            candidateRankScore(b.population, b.distanceKm) -
              candidateRankScore(a.population, a.distanceKm) ||
            a.distanceKm - b.distanceKm,
        )
        .slice(0, limit);
    }
  }

  return CITY_INDEX.map((city) => ({
    ...city,
    distanceKm: haversineKm(origin, city),
  }))
    .filter((city) => {
      if (city.distanceKm < 5) return false;
      if (exclude && city.name.toLowerCase() === exclude) return false;
      return city.distanceKm <= radiusKm;
    })
    .sort(
      (a, b) =>
        candidateRankScore(b.population, b.distanceKm) -
          candidateRankScore(a.population, a.distanceKm) ||
        a.distanceKm - b.distanceKm,
    )
    .slice(0, limit);
}

export async function getPlaceById(id: string) {
  const candidates = placeIdCandidates(id);
  const db = getDb();
  if (db) {
    for (const candidate of candidates) {
      const [row] = await db
        .select()
        .from(places)
        .where(eq(places.id, candidate))
        .limit(1);
      if (row) return row;
    }
  }
  for (const candidate of candidates) {
    const city = CITY_INDEX.find((c) => c.id === candidate);
    if (city) return city;
  }
  return null;
}

/** Normalize URL / legacy geonames ids: gn:123 ↔ gn-123. */
export function placeIdCandidates(raw: string): string[] {
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  const out = [id];
  if (id.startsWith("gn:")) out.push(`gn-${id.slice(3)}`);
  if (id.startsWith("gn-")) out.push(`gn:${id.slice(3)}`);
  return [...new Set(out)];
}
