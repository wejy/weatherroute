import "server-only";

import { createModuleLogger } from "@/lib/logger";
import type { PlaceDto } from "@/lib/types";
import { haversineKm } from "@/server/integrations/mocks/data";

const log = createModuleLogger("server.integrations.places.nearby-overpass");
type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: {
    name?: string;
    "name:en"?: string;
    place?: string;
    population?: string;
    "addr:country"?: string;
    "is_in:country"?: string;
  };
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type CachedPlaces = Array<PlaceDto & { distanceKm: number }>;

const nearbyCache = new Map<
  string,
  { expiresAt: number; places: CachedPlaces }
>();
/** Skip re-hitting Overpass after a timeout/error for a short while. */
const failureCooldown = new Map<string, number>();

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 15 * 60 * 1000;
/** Hard client wait — discover must not stall on OSM. */
const FETCH_BUDGET_MS = 7000;
/** Keep queries small; denser local POIs matter more than continent-scale OSM. */
const MAX_OVERPASS_RADIUS_KM = 150;

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

function cacheKey(lat: number, lon: number, radiusKm: number): string {
  return `${lat.toFixed(1)},${lon.toFixed(1)},${Math.round(radiusKm / 25) * 25}`;
}

function placeRank(place: string | undefined): number {
  switch (place) {
    case "city":
      return 0;
    case "town":
      return 1;
    case "municipality":
      return 2;
    case "village":
      return 3;
    default:
      return 4;
  }
}

function buildQuery(
  origin: { lat: number; lon: number },
  radiusKm: number,
  limit: number,
): string {
  const radiusM = Math.round(Math.min(Math.max(radiusKm, 10), MAX_OVERPASS_RADIUS_KM) * 1000);
  // Cities + towns only — villages explode result size and timeout often.
  const includeVillages = radiusKm <= 60;
  const placeFilter = includeVillages
    ? '["place"~"^(city|town|village)$"]'
    : '["place"~"^(city|town)$"]';

  return `
[out:json][timeout:6];
node${placeFilter}(around:${radiusM},${origin.lat},${origin.lon});
out body ${Math.min(Math.max(limit * 3, 40), 100)};
`.trim();
}

async function postOverpass(
  endpoint: string,
  query: string,
  signal: AbortSignal,
): Promise<OverpassResponse | null> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/json",
      "User-Agent": "Solviax/1.0 (weather trip planner)",
    },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });
  if (!res.ok) return null;
  return (await res.json()) as OverpassResponse;
}

function parseElements(
  origin: { lat: number; lon: number },
  radiusKm: number,
  elements: OverpassElement[],
): CachedPlaces {
  const places = elements
    .flatMap((el) => {
      if (el.lat == null || el.lon == null) return [];
      const name = el.tags?.name || el.tags?.["name:en"];
      if (!name) return [];
      const population = Number(el.tags?.population ?? 0);
      const distanceKm = haversineKm(origin, { lat: el.lat, lon: el.lon });
      if (distanceKm < 5 || distanceKm > radiusKm) return [];

      const country =
        el.tags?.["is_in:country"] || el.tags?.["addr:country"] || undefined;
      const placeType = el.tags?.place ?? "town";

      return [
        {
          id: `osm-${el.type}-${el.id}`,
          name,
          placeName: country ? `${name}, ${country}` : name,
          country,
          lat: el.lat,
          lon: el.lon,
          distanceKm,
          _rank: placeRank(placeType),
          _population: Number.isFinite(population) ? population : 0,
        },
      ];
    })
    .sort((a, b) => {
      if (a._rank !== b._rank) return a._rank - b._rank;
      if (b._population !== a._population) return b._population - a._population;
      return a.distanceKm - b.distanceKm;
    })
    .map(({ _rank: _r, _population: _p, ...place }) => place);

  const seen = new Set<string>();
  const deduped: CachedPlaces = [];
  for (const place of places) {
    const k = place.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(place);
  }
  return deduped;
}

/**
 * Live nearby settlements from OpenStreetMap (Overpass).
 * Soft-fails quickly on timeout so discover still uses the curated catalog.
 */
export async function fetchNearbySettlements(
  origin: { lat: number; lon: number },
  radiusKm: number,
  opts?: { limit?: number; excludeName?: string },
): Promise<CachedPlaces> {
  const limit = opts?.limit ?? 40;
  const exclude = opts?.excludeName?.toLowerCase().trim();
  const effectiveRadius = Math.min(radiusKm, MAX_OVERPASS_RADIUS_KM);
  const key = cacheKey(origin.lat, origin.lon, effectiveRadius);

  const cached = nearbyCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return filterAndLimit(cached.places, exclude, limit);
  }

  const coolUntil = failureCooldown.get(key) ?? 0;
  if (coolUntil > Date.now()) {
    return [];
  }

  const query = buildQuery(origin, effectiveRadius, limit);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_BUDGET_MS);

  try {
    let data: OverpassResponse | null = null;
    let lastError: unknown;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      if (controller.signal.aborted) break;
      try {
        data = await postOverpass(endpoint, query, controller.signal);
        if (data) break;
      } catch (error) {
        lastError = error;
        // Try next mirror unless the whole budget aborted.
        if (controller.signal.aborted) break;
      }
    }

    if (!data?.elements) {
      failureCooldown.set(key, Date.now() + FAILURE_COOLDOWN_MS);
      if (lastError && !(lastError instanceof Error && lastError.name === "AbortError") && !(lastError instanceof DOMException && lastError.name === "TimeoutError")) {
        log.warn(
          { err: lastError instanceof Error ? lastError.message : lastError },
          "Overpass unavailable",
        );
      } else {
        log.warn(
          { key },
          "Overpass skipped (timeout/busy); using curated places",
        );
      }
      return [];
    }

    const deduped = parseElements(origin, effectiveRadius, data.elements);
    nearbyCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      places: deduped,
    });
    failureCooldown.delete(key);

    return filterAndLimit(deduped, exclude, limit);
  } catch (error) {
    failureCooldown.set(key, Date.now() + FAILURE_COOLDOWN_MS);
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      log.warn({ key }, "Overpass timed out; using curated places");
    } else {
      log.warn(
        { err: error instanceof Error ? error.message : error, key },
        "Overpass nearby failed",
      );
    }
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function filterAndLimit(
  places: CachedPlaces,
  exclude: string | undefined,
  limit: number,
): CachedPlaces {
  return places
    .filter((p) => !(exclude && p.name.toLowerCase() === exclude))
    .slice(0, limit);
}
