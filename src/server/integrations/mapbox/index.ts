import "server-only";

import type { PlaceDto } from "@/lib/types";
import { env, hasMapbox } from "@/lib/env";
import { PLACES } from "@/server/integrations/mocks/data";
import { openMeteoSearchPlaces } from "@/server/integrations/geocoding/openmeteo";
import { nominatimReverse } from "@/server/integrations/geocoding/nominatim";

const reverseCache = new Map<string, { expiresAt: number; value: PlaceDto }>();
const REVERSE_TTL_MS = 24 * 60 * 60 * 1000;

export async function searchPlaces(
  query: string,
  limit = 5,
): Promise<PlaceDto[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Prefer free Open-Meteo geocoding (no key) for worldwide cities/towns.
  try {
    const results = await openMeteoSearchPlaces(q, limit);
    if (results.length > 0) return results;
  } catch (error) {
    console.warn("[geocode] Open-Meteo search failed", error);
  }

  if (hasMapbox()) {
    try {
      return await mapboxSearch(q, limit);
    } catch (error) {
      console.warn("[geocode] Mapbox search failed", error);
    }
  }

  return mockSearch(q, limit);
}

async function mapboxSearch(query: string, limit: number): Promise<PlaceDto[]> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  );
  url.searchParams.set("access_token", env.mapboxToken);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("types", "place,locality,region");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Mapbox geocode ${res.status}`);

  const data = (await res.json()) as {
    features: Array<{
      id: string;
      place_name: string;
      text: string;
      center: [number, number];
      context?: Array<{ id: string; text: string; short_code?: string }>;
    }>;
  };

  return data.features.map((f) => {
    const country = f.context?.find((c) => c.id.startsWith("country"));
    return {
      id: f.id,
      name: f.text,
      placeName: f.place_name,
      country: country?.text,
      countryCode: country?.short_code?.toUpperCase(),
      lon: f.center[0],
      lat: f.center[1],
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
  ).slice(0, limit);
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
  };
}
