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
  lang: "en" | "fi" = "en",
): Promise<PlaceDto> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}:${lang}`;
  const cached = reverseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const remember = (place: PlaceDto) => {
    reverseCache.set(key, {
      value: place,
      expiresAt: Date.now() + REVERSE_TTL_MS,
    });
    return place;
  };

  if (hasMapbox()) {
    try {
      const place = await mapboxReverse(lat, lon, lang);
      if (place && !isBlockedPlace(place)) {
        return remember(place);
      }
    } catch (error) {
      console.warn("[geocode] Mapbox reverse failed", error);
    }
  }

  try {
    const place = await nominatimReverse(lat, lon, lang);
    if (isBlockedPlace(place)) {
      throw new Error("Blocked country");
    }
    return remember(place);
  } catch (error) {
    console.warn("[geocode] reverse failed, using nearest mock", error);
    return remember(nearestMock(lat, lon, lang));
  }
}

async function mapboxReverse(
  lat: number,
  lon: number,
  lang: "en" | "fi",
): Promise<PlaceDto | null> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json`,
  );
  url.searchParams.set("access_token", env.mapboxToken);
  url.searchParams.set("limit", "1");
  // Prefer a locality / place name for the origin field (not a raw street number).
  url.searchParams.set("types", "place,locality,neighborhood,address,poi");
  url.searchParams.set("language", lang);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Mapbox reverse ${res.status}`);

  const data = (await res.json()) as {
    features?: Array<{
      id: string;
      place_name: string;
      text: string;
      center: [number, number];
      place_type?: string[];
      context?: Array<{ id: string; text: string; short_code?: string }>;
    }>;
  };

  const f = data.features?.[0];
  if (!f) return null;

  const country = f.context?.find((c) => c.id.startsWith("country"));
  const placeFeature = f.context?.find((c) => c.id.startsWith("place"));
  const locality = f.context?.find(
    (c) => c.id.startsWith("locality") || c.id.startsWith("neighborhood"),
  );

  // For address/POI hits, surface the city/locality as the short name when possible.
  const isAddressOrPoi =
    f.place_type?.includes("address") || f.place_type?.includes("poi");
  const name = isAddressOrPoi
    ? locality?.text || placeFeature?.text || f.text
    : f.text;

  const placeName = isAddressOrPoi
    ? [name, country?.text].filter(Boolean).join(", ") || f.place_name
    : f.place_name;

  const typePrefix = f.place_type?.[0] ? `${f.place_type[0]}.x` : f.id;

  return {
    id: f.id,
    name,
    placeName,
    country: country?.text,
    countryCode: country?.short_code?.toUpperCase(),
    // Keep the precise GPS point for discover radius (not the feature centroid).
    lat,
    lon,
    kind: kindFromMapboxId(typePrefix),
  };
}

function nearestMock(
  lat: number,
  lon: number,
  lang: "en" | "fi" = "en",
): PlaceDto {
  const nearest = PLACES.reduce((best, place) => {
    const d = Math.abs(place.lat - lat) + Math.abs(place.lon - lon);
    const bestD = Math.abs(best.lat - lat) + Math.abs(best.lon - lon);
    return d < bestD ? place : best;
  });

  const approx = lang === "fi" ? "noin" : "approx.";
  return {
    ...nearest,
    placeName: `${nearest.name} (${approx})`,
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
  /** 0 = Mapbox primary (usually fastest); 1+ = alternatives. */
  alternativeIndex: number;
};

/** Mapbox Directions — one or more road/path routes (optional alternatives). */
export async function getMapboxRoutes(
  from: { lon: number; lat: number },
  to: { lon: number; lat: number },
  profile: MapboxRouteProfile = "driving",
  opts?: { alternatives?: boolean },
): Promise<MapboxRoute[]> {
  if (!hasMapbox()) return [];

  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}`,
  );
  url.searchParams.set("access_token", env.mapboxToken);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");
  if (opts?.alternatives) {
    url.searchParams.set("alternatives", "true");
  }

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

  const routes = data.routes ?? [];
  return routes
    .filter((route) => route.geometry?.coordinates?.length)
    .map((route, i) => ({
      distanceKm: Math.round(route.distance / 1000),
      durationSeconds: Math.round(route.duration),
      geometry: route.geometry.coordinates,
      profile,
      alternativeIndex: i,
    }));
}

/** Primary (usually fastest) Mapbox route. */
export async function getMapboxRoute(
  from: { lon: number; lat: number },
  to: { lon: number; lat: number },
  profile: MapboxRouteProfile = "driving",
): Promise<MapboxRoute | null> {
  const routes = await getMapboxRoutes(from, to, profile, {
    alternatives: false,
  });
  return routes[0] ?? null;
}

/** @deprecated Prefer getMapboxRoute(..., "driving") */
export async function getDrivingRoute(
  from: { lon: number; lat: number },
  to: { lon: number; lat: number },
): Promise<Omit<MapboxRoute, "profile" | "alternativeIndex"> | null> {
  const route = await getMapboxRoute(from, to, "driving");
  if (!route) return null;
  const { profile: _p, alternativeIndex: _i, ...rest } = route;
  return rest;
}
