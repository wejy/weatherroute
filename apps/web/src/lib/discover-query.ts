/** Query keys shared across discover, map, destinations, and routes. */
export const DISCOVER_PARAM_KEYS = [
  "origin",
  "lat",
  "lon",
  "datePreset",
  "startDate",
  "endDate",
  "distance",
  "radiusKm",
  "weatherGoal",
  "mode",
] as const;

export const LOCATION_PARAM_KEYS = ["origin", "lat", "lon"] as const;

type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined | null>;

function firstValue(
  value: string | string[] | undefined | null,
): string | undefined {
  if (value == null) return undefined;
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed || undefined;
}

/** Read selected keys from URLSearchParams or a flat/raw searchParams object. */
export function pickParams(
  source: ParamSource,
  keys: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const raw =
      source instanceof URLSearchParams
        ? source.get(key)
        : firstValue(source[key]);
    if (raw) out[key] = raw;
  }
  return out;
}

/** Merge path + existing query with extra params (extra wins on conflict). */
export function withQuery(
  href: string,
  extra: Record<string, string | number | undefined | null>,
): string {
  const [pathAndHash, existingQs = ""] = href.split("?");
  const [path, hash = ""] = pathAndHash.split("#");
  const params = new URLSearchParams(existingQs);
  for (const [key, value] of Object.entries(extra)) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return `${path || "/"}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}

export function locationFromParams(source: ParamSource): {
  origin?: string;
  lat?: string;
  lon?: string;
} {
  return pickParams(source, LOCATION_PARAM_KEYS);
}

/** Destination detail URL, carrying trip dates + manual origin when present. */
export function destinationHref(
  slug: string,
  opts: {
    datePreset?: string;
    startDate?: string;
    endDate?: string;
    distance?: string;
    radiusKm?: string | number;
    weatherGoal?: string;
    origin?: string;
    lat?: string | number;
    lon?: string | number;
    mode?: string;
  } = {},
): string {
  // encodeURIComponent keeps geonames ids like gn:123 URL-safe (colon → %3A).
  return withQuery(`/destinations/${encodeURIComponent(slug)}`, {
    datePreset: opts.datePreset,
    startDate: opts.startDate,
    endDate: opts.endDate,
    distance: opts.distance,
    radiusKm: opts.radiusKm,
    weatherGoal: opts.weatherGoal,
    origin: opts.origin,
    lat: opts.lat,
    lon: opts.lon,
    mode: opts.mode,
  });
}

/** Mapbox Geocoding feature ids look like `place.2099272`, `address.…`. */
const MAPBOX_ID_PREFIX =
  /^(place|address|poi|locality|region|district|neighborhood|country|postcode|airport)\./i;

export function isMapboxFeatureId(id: string | null | undefined): boolean {
  return Boolean(id && MAPBOX_ID_PREFIX.test(id));
}

/**
 * True when an id can resolve on `/destinations/[slug]`
 * (katalogi / gn-*, not Mapbox feature or bare coordinate).
 */
export function isLinkableDestinationId(
  id: string | null | undefined,
): id is string {
  if (!id || id.startsWith("coord-")) return false;
  if (isMapboxFeatureId(id)) return false;
  return id.length > 0;
}

/** Routes URL: `from` defaults to manual origin name when set. */
export function routesHref(opts: {
  from?: string;
  to?: string;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
  distance?: string;
  radiusKm?: string | number;
  weatherGoal?: string;
  origin?: string;
  lat?: string | number;
  lon?: string | number;
  mode?: string;
} = {}): string {
  const from = opts.from || opts.origin;
  return withQuery("/routes", {
    from,
    to: opts.to,
    datePreset: opts.datePreset,
    startDate: opts.startDate,
    endDate: opts.endDate,
    distance: opts.distance,
    radiusKm: opts.radiusKm,
    weatherGoal: opts.weatherGoal,
    origin: opts.origin || from,
    lat: opts.lat,
    lon: opts.lon,
    mode: opts.mode,
  });
}
