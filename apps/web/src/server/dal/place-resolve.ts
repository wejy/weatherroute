import "server-only";

import { and, gte, ilike, lte } from "drizzle-orm";
import type { PlaceDto } from "@/lib/types";
import { isLinkableDestinationId } from "@/lib/discover-query";
import { haversineKm } from "@/server/integrations/mocks/data";
import { CITY_INDEX } from "@/server/integrations/places/city-index";
import { getDb } from "@/db";
import { places } from "@/db/schema";
import { getPlaceById } from "@/server/dal/places";

const MATCH_RADIUS_KM = 25;

function primaryName(name?: string, placeName?: string): string {
  const fromPlace = placeName?.split(",")[0]?.trim();
  return (name || fromPlace || "").trim();
}

function namesMatch(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

function toPlaceDto(row: {
  id: string;
  name: string;
  placeName: string;
  country?: string | null;
  countryCode?: string | null;
  lat: number;
  lon: number;
}): PlaceDto {
  return {
    id: row.id,
    name: row.name,
    placeName: row.placeName,
    country: row.country ?? undefined,
    countryCode: row.countryCode ?? undefined,
    lat: row.lat,
    lon: row.lon,
    kind: "place",
  };
}

function slugifyName(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Map a geocoded (often Mapbox) place onto an internal catalog / gn-* place
 * that `/destinations/[slug]` can open. Returns null when no match.
 */
export async function resolveInternalPlace(input: {
  id?: string | null;
  name?: string;
  placeName?: string;
  lat: number;
  lon: number;
}): Promise<PlaceDto | null> {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lon)) {
    return null;
  }

  if (input.id && isLinkableDestinationId(input.id)) {
    const byId = await getPlaceById(input.id);
    if (byId) return toPlaceDto(byId);
  }

  const label = primaryName(input.name, input.placeName);
  if (!label) return null;

  const origin = { lat: input.lat, lon: input.lon };
  const candidates: Array<
    PlaceDto & { distanceKm: number; population: number }
  > = [];

  const db = getDb();
  if (db) {
    const latDelta = MATCH_RADIUS_KM / 111;
    const lonDelta =
      MATCH_RADIUS_KM /
      (111 * Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)));

    try {
      const rows = await db
        .select()
        .from(places)
        .where(
          and(
            gte(places.lat, origin.lat - latDelta),
            lte(places.lat, origin.lat + latDelta),
            gte(places.lon, origin.lon - lonDelta),
            lte(places.lon, origin.lon + lonDelta),
            ilike(places.name, label),
          ),
        )
        .limit(20);

      for (const row of rows) {
        const distanceKm = haversineKm(origin, {
          lat: row.lat,
          lon: row.lon,
        });
        if (distanceKm > MATCH_RADIUS_KM) continue;
        if (!namesMatch(row.name, label)) continue;
        candidates.push({
          ...toPlaceDto(row),
          distanceKm,
          population: row.population,
        });
      }
    } catch {
      // Fall through to CITY_INDEX
    }
  }

  for (const city of CITY_INDEX) {
    if (!namesMatch(city.name, label)) continue;
    const distanceKm = haversineKm(origin, city);
    if (distanceKm > MATCH_RADIUS_KM) continue;
    candidates.push({
      ...toPlaceDto(city),
      distanceKm,
      population: city.population,
    });
  }

  if (candidates.length === 0) {
    const bySlug = CITY_INDEX.find((c) => c.id === slugifyName(label));
    if (bySlug) {
      const distanceKm = haversineKm(origin, bySlug);
      if (distanceKm <= MATCH_RADIUS_KM) {
        return toPlaceDto(bySlug);
      }
    }
    return null;
  }

  candidates.sort(
    (a, b) => a.distanceKm - b.distanceKm || b.population - a.population,
  );

  const best = candidates[0]!;
  return {
    id: best.id,
    name: best.name,
    placeName: best.placeName,
    country: best.country,
    countryCode: best.countryCode,
    lat: best.lat,
    lon: best.lon,
    kind: "place",
  };
}
