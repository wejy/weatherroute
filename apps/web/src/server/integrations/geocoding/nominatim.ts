import "server-only";

import type { PlaceDto } from "@/lib/types";

interface NominatimReverse {
  place_id?: number;
  display_name?: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    city_district?: string;
    suburb?: string;
    hamlet?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  lat?: string;
  lon?: string;
}

/**
 * Free OSM Nominatim reverse geocode (no key).
 * Usage policy: identify the app + keep request volume low (server-side cache).
 */
export async function nominatimReverse(
  lat: number,
  lon: number,
  lang: "en" | "fi" = "en",
): Promise<PlaceDto> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": lang === "fi" ? "fi,en" : "en",
      "User-Agent": "WeatherTrip/1.0 (https://github.com/weathertrip; demo)",
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`Nominatim reverse error: ${res.status}`);
  }

  const data = (await res.json()) as NominatimReverse;
  const addr = data.address ?? {};
  const name =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.city_district ||
    addr.suburb ||
    addr.hamlet ||
    addr.county ||
    data.name ||
    (lang === "fi" ? "Nykyinen sijainti" : "Current location");

  const placeName = [name, addr.state, addr.country].filter(Boolean).join(", ");

  return {
    id: data.place_id
      ? `nom-${data.place_id}`
      : `rev-${lat.toFixed(3)},${lon.toFixed(3)}`,
    name,
    placeName: placeName || data.display_name || name,
    country: addr.country,
    countryCode: addr.country_code?.toUpperCase(),
    lat,
    lon,
  };
}
