/**
 * Approximate mainland Finland + Åland bounding box.
 * Keep in sync with apps/web/src/lib/finland-geo.ts
 */
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

  if (name && !name.includes(",")) return true;
  return false;
}
