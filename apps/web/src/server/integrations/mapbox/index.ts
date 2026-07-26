import "server-only";

import type { PlaceDto } from "@/lib/types";
import { env, hasMapbox } from "@/lib/env";
import { PLACES } from "@/server/integrations/mocks/data";
import { openMeteoSearchPlaces } from "@/server/integrations/geocoding/openmeteo";
import { nominatimReverse } from "@/server/integrations/geocoding/nominatim";
import { filterBlockedPlaces, isBlockedPlace } from "@/lib/geo-block";

const reverseCache = new Map<string, { expiresAt: number; value: PlaceDto }>();
const REVERSE_TTL_MS = 24 * 60 * 60 * 1000;

/** Types for street addresses, POIs, and cities. */
const PRECISE_TYPES =
  "address,poi,place,locality,neighborhood,district,region";
/** City / region only (discover-style). */
const CITY_TYPES = "place,locality,region";

export type PlaceSearchMode = "precise" | "cities";

export type PlaceSearchOptions = {
  limit?: number;
  mode?: PlaceSearchMode;
  lang?: "en" | "fi";
  proximity?: { lat: number; lon: number };
};

function kindFromMapboxId(id: string): PlaceDto["kind"] {
  const prefix = id.split(".")[0];
  if (
    prefix === "address" ||
    prefix === "poi" ||
    prefix === "place" ||
    prefix === "locality" ||
    prefix === "region"
  ) {
    return prefix;
  }
  if (prefix === "neighborhood" || prefix === "district") return "locality";
  return "other";
}

export async function searchPlaces(
  query: string,
  limitOrOpts: number | PlaceSearchOptions = 5,
): Promise<PlaceDto[]> {
  const opts: PlaceSearchOptions =
    typeof limitOrOpts === "number" ? { limit: limitOrOpts } : limitOrOpts;
  const limit = opts.limit ?? 5;
  const mode = opts.mode ?? "precise";
  const q = query.trim();
  if (q.length < 2) return [];

  if (mode === "precise" && hasMapbox()) {
    try {
      const results = await mapboxSearch(q, Math.min(limit + 5, 10), {
        types: PRECISE_TYPES,
        lang: opts.lang,
        proximity: opts.proximity,
      });
      const filtered = filterBlockedPlaces(results).slice(0, limit);
      if (filtered.length > 0) return filtered;
    } catch (error) {
      console.warn("[geocode] Mapbox precise search failed", error);
    }
  }

  // Cities mode, or precise fallback when Mapbox miss/unavailable.
  try {
    const results = await openMeteoSearchPlaces(q, Math.min(limit + 5, 10));
    const filtered = filterBlockedPlaces(results)
      .slice(0, limit)
      .map((p) => ({ ...p, kind: "place" as const }));
    if (filtered.length > 0) return filtered;
  } catch (error) {
    console.warn("[geocode] Open-Meteo search failed", error);
  }

  if (hasMapbox()) {
    try {
      const results = await mapboxSearch(q, Math.min(limit + 5, 10), {
        types: mode === "cities" ? CITY_TYPES : PRECISE_TYPES,
        lang: opts.lang,
        proximity: opts.proximity,
      });
      return filterBlockedPlaces(results).slice(0, limit);
    } catch (error) {
      console.warn("[geocode] Mapbox search failed", error);
    }
  }

  return filterBlockedPlaces(mockSearch(q, limit));
}

async function mapboxSearch(
  query: string,
  limit: number,
  opts: {
    types: string;
    lang?: "en" | "fi";
    proximity?: { lat: number; lon: number };
  },
): Promise<PlaceDto[]> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  );
  url.searchParams.set("access_token", env.mapboxToken);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("types", opts.types);
  url.searchParams.set("autocomplete", "true");
  if (opts.lang) url.searchParams.set("language", opts.lang);
  if (opts.proximity) {
    url.searchParams.set(
      "proximity",
      `${opts.proximity.lon},${opts.proximity.lat}`,
    );
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Mapbox geocode ${res.status}`);

  const data = (await res.json()) as {
    features: Array<{
      id: string;
      place_name: string;
      text: string;
      center: [number, number];
      place_type?: string[];
      context?: Array<{ id: string; text: string; short_code?: string }>;
    }>;
  };

  return data.features.map((f) => {
    const country = f.context?.find((c) => c.id.startsWith("country"));
    const typePrefix = f.place_type?.[0]
      ? `${f.place_type[0]}.x`
      : f.id;
    return {
      id: f.id,
      name: f.text,
      placeName: f.place_name,
      country: country?.text,
      countryCode: country?.short_code?.toUpperCase(),
      lon: f.center[0],
      lat: f.center[1],
      kind: kindFromMapboxId(typePrefix),
    };
  });
}

function mockSearch(query: string, limit: number): PlaceDto[] {
  const q = query.toLowerCase().trim();
  return PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.placeName.toLowerCase().includes(q) ||
      p.country?.toLowerCase().includes(q),
  )
    .slice(0, limit)
    .map((p) => ({ ...p, kind: "place" as const }));
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<PlaceDto> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = reverseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const place = await nominatimReverse(lat, lon);
    if (isBlockedPlace(place)) {
      throw new Error("Blocked country");
    }
    reverseCache.set(key, {
      value: place,
      expiresAt: Date.now() + REVERSE_TTL_MS,
    });
    return place;
  } catch (error) {
    console.warn("[geocode] reverse failed, using nearest mock", error);
    return nearestMock(lat, lon);
  }
}

function nearestMock(lat: number, lon: number): PlaceDto {
  const nearest = PLACES.reduce((best, place) => {
    const d = Math.abs(place.lat - lat) + Math.abs(place.lon - lon);
    const bestD = Math.abs(best.lat - lat) + Math.abs(best.lon - lon);
    return d < bestD ? place : best;
  });

  return {
    ...nearest,
    placeName: `${nearest.name} (approx.)`,
    lat,
    lon,
    kind: "place",
  };
}

export type MapboxRouteProfile = "driving" | "cycling";

export type MapboxRoute = {
  distanceKm: number;
  durationSeconds: number;
  /** [lon, lat] pairs along the road / path network. */
  geometry: [number, number][];
  profile: MapboxRouteProfile;
};

/** Mapbox Directions — road/path route for driving or cycling. */
export async function getMapboxRoute(
  from: { lon: number; lat: number },
  to: { lon: number; lat: number },
  profile: MapboxRouteProfile = "driving",
): Promise<MapboxRoute | null> {
  if (!hasMapbox()) return null;

  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}`,
  );
  url.searchParams.set("access_token", env.mapboxToken);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Mapbox directions ${res.status}`);
  }

  const data = (await res.json()) as {
    code?: string;
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { type: string; coordinates: [number, number][] };
    }>;
  };

  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) {
    return null;
  }

  return {
    distanceKm: Math.round(route.distance / 1000),
    durationSeconds: Math.round(route.duration),
    geometry: route.geometry.coordinates,
    profile,
  };
}

/** @deprecated Prefer getMapboxRoute(..., "driving") */
export async function getDrivingRoute(
  from: { lon: number; lat: number },
  to: { lon: number; lat: number },
): Promise<Omit<MapboxRoute, "profile"> | null> {
  const route = await getMapboxRoute(from, to, "driving");
  if (!route) return null;
  const { profile: _p, ...rest } = route;
  return rest;
}
