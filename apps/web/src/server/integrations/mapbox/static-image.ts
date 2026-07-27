import "server-only";

import { assertPublicMapboxToken, getMapboxPublicToken } from "@/lib/env";

/**
 * Mapbox Static Images — map tile snapshot (not a POI photo).
 * Used when Wikipedia has no thumbnail for a place.
 * Only public pk. tokens may appear in client-facing URLs.
 */
export function mapboxStaticImageUrl(
  lat: number,
  lon: number,
  opts?: { width?: number; height?: number; zoom?: number },
): string | null {
  const token = getMapboxPublicToken();
  if (!token.startsWith("pk.")) return null;

  try {
    assertPublicMapboxToken(token);
  } catch {
    return null;
  }

  const width = opts?.width ?? 600;
  const height = opts?.height ?? 400;
  const zoom = opts?.zoom ?? 10;
  const lonStr = lon.toFixed(5);
  const latStr = lat.toFixed(5);

  return (
    `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/` +
    `${lonStr},${latStr},${zoom},0/${width}x${height}@2x` +
    `?access_token=${encodeURIComponent(token)}`
  );
}
