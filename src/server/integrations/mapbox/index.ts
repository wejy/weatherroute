import "server-only";

import type { PlaceDto } from "@/lib/types";
import { env, hasMapbox } from "@/lib/env";
import { PLACES } from "@/server/integrations/mocks/data";

export async function searchPlaces(
  query: string,
  limit = 5,
): Promise<PlaceDto[]> {
  if (!hasMapbox()) {
    return mockSearch(query, limit);
  }

  try {
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
  } catch (error) {
    console.warn("[mapbox] search failed, using mock", error);
    return mockSearch(query, limit);
  }
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
  const nearest = PLACES.reduce((best, place) => {
    const d =
      Math.abs(place.lat - lat) + Math.abs(place.lon - lon);
    const bestD = Math.abs(best.lat - lat) + Math.abs(best.lon - lon);
    return d < bestD ? place : best;
  });

  return {
    ...nearest,
    lat,
    lon,
  };
}
