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
  "departureStartHour",
  "departureEndHour",
  "earliestHour",
] as const;

export const LOCATION_PARAM_KEYS = ["origin", "lat", "lon"] as const;

/** Paths that should carry the full discover filter query. */
export const DISCOVER_NAV_PATHS = new Set(["/", "/map"]);

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
  if (!id || id.startsWith("coord-") || id.startsWith("origin-")) return false;
  if (isMapboxFeatureId(id)) return false;
  return id.length > 0;
}

/** Destination + routes links for a map marker, carrying discover filters. */
export function markerNavHrefs(
  marker: { id: string; name: string },
  locationQuery: {
    origin?: string;
    lat?: string | number;
    lon?: string | number;
    datePreset?: string;
    startDate?: string;
    endDate?: string;
    distance?: string;
    radiusKm?: string | number;
    weatherGoal?: string;
    mode?: string;
  } = {},
): { destinationHref?: string; routeHref: string } {
  return {
    destinationHref: isLinkableDestinationId(marker.id)
      ? destinationHref(marker.id, locationQuery)
      : undefined,
    routeHref: routesHref({
      from: locationQuery.origin,
      to: marker.name,
      ...locationQuery,
    }),
  };
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
  departureStartHour?: string | number;
  departureEndHour?: string | number;
  earliestHour?: string | number;
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
    departureStartHour: opts.departureStartHour,
    departureEndHour: opts.departureEndHour,
    earliestHour: opts.earliestHour,
  });
}

/**
 * Build a nav href that keeps trip filters when moving between
 * discover, map, routes, and destination pages.
 */
export function preserveDiscoverHref(
  href: string,
  current: ParamSource,
): string {
  const [pathWithQuery, hashPart] = href.split("#");
  const [path, existingQs = ""] = (pathWithQuery || "/").split("?");
  const base = path || "/";
  const hash = hashPart ? `#${hashPart}` : "";
  const hrefParams = new URLSearchParams(existingQs);
  const discover = pickParams(current, DISCOVER_PARAM_KEYS);

  // Routes often uses `from` instead of `origin`.
  if (!discover.origin) {
    const from =
      current instanceof URLSearchParams
        ? current.get("from")?.trim() || undefined
        : firstValue(current.from);
    if (from) discover.origin = from;
  }
  if (!discover.lat) {
    const fromLat =
      current instanceof URLSearchParams
        ? current.get("fromLat")?.trim() || undefined
        : firstValue(current.fromLat);
    if (fromLat) discover.lat = fromLat;
  }
  if (!discover.lon) {
    const fromLon =
      current instanceof URLSearchParams
        ? current.get("fromLon")?.trim() || undefined
        : firstValue(current.fromLon);
    if (fromLon) discover.lon = fromLon;
  }

  if (DISCOVER_NAV_PATHS.has(base)) {
    return withQuery(`${base}${hash}`, discover);
  }

  if (base === "/routes") {
    const from =
      hrefParams.get("from") ||
      discover.origin ||
      (current instanceof URLSearchParams
        ? current.get("from")?.trim() || undefined
        : firstValue(current.from)) ||
      undefined;
    const to =
      hrefParams.get("to") ||
      (current instanceof URLSearchParams
        ? current.get("to")?.trim() || undefined
        : firstValue(current.to)) ||
      undefined;
    return withQuery(`${base}${hash}`, {
      ...discover,
      from: from || undefined,
      to: to || undefined,
      origin: discover.origin || from || undefined,
    });
  }

  if (base.startsWith("/destinations/")) {
    return withQuery(`${base}${hash}`, {
      ...Object.fromEntries(hrefParams.entries()),
      ...discover,
    });
  }

  return href;
}
