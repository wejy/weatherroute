import type { PlaceDto } from "@/lib/types";

/** Approximate mainland Finland + Åland bounding box. */
export const FINLAND_BBOX = {
  minLat: 59.45,
  maxLat: 70.1,
  minLon: 19.0,
  maxLon: 31.6,
} as const;

export function coordsInFinland(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= FINLAND_BBOX.minLat &&
    lat <= FINLAND_BBOX.maxLat &&
    lon >= FINLAND_BBOX.minLon &&
    lon <= FINLAND_BBOX.maxLon
  );
}

/**
 * Whether an origin is treated as Finland for routes defaults
 * (Helsinki as default “To” only inside FI).
 */
export function isLikelyFinlandOrigin(opts: {
  name?: string | null;
  lat?: number | null;
  lon?: number | null;
  countryCode?: string | null;
}): boolean {
  const code = opts.countryCode?.trim().toUpperCase();
  if (code === "FI") return true;
  if (code && code.length === 2) return false;

  const name = opts.name?.trim() ?? "";
  if (/\b(finland|suomi)\b/i.test(name)) return true;
  // Explicit other-country labels in the place string.
  if (
    /\b(sweden|sverige|norway|norge|denmark|danmark|estonia|eesti|germany|deutschland|france|spain|italy|uk|united kingdom|usa|united states|canada|poland|netherlands)\b/i.test(
      name,
    )
  ) {
    return false;
  }

  if (
    opts.lat != null &&
    opts.lon != null &&
    Number.isFinite(opts.lat) &&
    Number.isFinite(opts.lon)
  ) {
    return coordsInFinland(opts.lat, opts.lon);
  }

  // Name-only Finnish cities without country → assume FI (legacy Discover links).
  if (name && !name.includes(",")) return true;

  return false;
}

export function placeLooksFinnish(place: Pick<PlaceDto, "placeName" | "lat" | "lon" | "countryCode" | "country">): boolean {
  return isLikelyFinlandOrigin({
    name: place.placeName || place.country,
    lat: place.lat,
    lon: place.lon,
    countryCode: place.countryCode,
  });
}
