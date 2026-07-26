import { and, eq, gte, lte } from "drizzle-orm";
import { haversineKm } from "@/server/integrations/mocks/data";
import {
  CITY_INDEX,
  candidateRankScore,
  type CityIndexEntry,
} from "@/server/integrations/places/city-index";
import { getDb } from "@/db";
import { places } from "@/db/schema";
import { isBlockedCountryCode, isBlockedPlace } from "@/lib/geo-block";

export type PlaceCandidate = CityIndexEntry & { distanceKm: number };

function notBlockedCandidate(city: {
  country?: string | null;
  countryCode?: string | null;
  placeName?: string | null;
}): boolean {
  return !isBlockedPlace(city);
}

function normalizePlaceName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** ~1.1 km cell — collapses near-identical GeoNames points. */
function geoCellKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

/**
 * Keep first occurrence (caller should rank by population/distance first).
 * Drops duplicate ids, same settlement name, and near-identical coordinates.
 */
export function dedupePlaceCandidates<
  T extends {
    id: string;
    name: string;
    lat: number;
    lon: number;
  },
>(cities: T[]): T[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const seenGeo = new Set<string>();
  const out: T[] = [];

  for (const city of cities) {
    if (seenIds.has(city.id)) continue;
    const nameKey = normalizePlaceName(city.name);
    if (nameKey && seenNames.has(nameKey)) continue;
    const geoKey = geoCellKey(city.lat, city.lon);
    if (seenGeo.has(geoKey)) continue;

    seenIds.add(city.id);
    if (nameKey) seenNames.add(nameKey);
    seenGeo.add(geoKey);
    out.push(city);
  }

  return out;
}

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
      const ranked = rows
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
          if (!notBlockedCandidate(city)) return false;
          if (city.distanceKm < 5) return false;
          if (exclude && city.name.toLowerCase() === exclude) return false;
          return city.distanceKm <= radiusKm;
        })
        .sort(
          (a, b) =>
            candidateRankScore(b.population, b.distanceKm) -
              candidateRankScore(a.population, a.distanceKm) ||
            a.distanceKm - b.distanceKm,
        );

      return dedupePlaceCandidates(ranked).slice(0, limit);
    }
  }

  const ranked = CITY_INDEX.map((city) => ({
    ...city,
    distanceKm: haversineKm(origin, city),
  }))
    .filter((city) => {
      if (!notBlockedCandidate(city)) return false;
      if (city.distanceKm < 5) return false;
      if (exclude && city.name.toLowerCase() === exclude) return false;
      return city.distanceKm <= radiusKm;
    })
    .sort(
      (a, b) =>
        candidateRankScore(b.population, b.distanceKm) -
          candidateRankScore(a.population, a.distanceKm) ||
        a.distanceKm - b.distanceKm,
    );

  return dedupePlaceCandidates(ranked).slice(0, limit);
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
      if (row) {
        if (
          isBlockedCountryCode(row.countryCode) ||
          isBlockedPlace({
            country: row.country,
            countryCode: row.countryCode,
            placeName: row.placeName,
          })
        ) {
          return null;
        }
        return row;
      }
    }
  }
  for (const candidate of candidates) {
    const city = CITY_INDEX.find((c) => c.id === candidate);
    if (city) {
      if (!notBlockedCandidate(city)) return null;
      return city;
    }
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
