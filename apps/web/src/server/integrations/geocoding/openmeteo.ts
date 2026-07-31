import "server-only";

import type { PlaceDto } from "@/lib/types";
import { filterBlockedPlaces } from "@/lib/geo-block";

interface OpenMeteoGeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
  population?: number;
  feature_code?: string;
}

interface OpenMeteoGeocodeResponse {
  results?: OpenMeteoGeocodeResult[];
}

function toPlace(r: OpenMeteoGeocodeResult): PlaceDto {
  const parts = [r.name, r.admin1, r.country].filter(Boolean);
  return {
    id: `om-${r.id}`,
    name: r.name,
    placeName: parts.join(", "),
    country: r.country,
    countryCode: r.country_code?.toUpperCase(),
    lat: r.latitude,
    lon: r.longitude,
  };
}

/** Free Open-Meteo geocoding — cities/towns worldwide, no API key. */
export async function openMeteoSearchPlaces(
  query: string,
  limit = 5,
): Promise<PlaceDto[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", String(Math.min(Math.max(limit, 5), 10)));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo geocode error: ${res.status}`);
  }

  const data = (await res.json()) as OpenMeteoGeocodeResponse;
  return filterBlockedPlaces((data.results ?? []).map(toPlace)).slice(
    0,
    limit,
  );
}
