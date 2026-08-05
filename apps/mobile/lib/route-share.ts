import type { TravelMode } from "@/lib/types";

export type LatLon = { lat: number; lon: number };
export type PlaceRef = LatLon | string;

function isLatLon(p: PlaceRef): p is LatLon {
  return typeof p === "object" && p != null && "lat" in p && "lon" in p;
}

function placeParam(p: PlaceRef): string {
  if (isLatLon(p)) return `${p.lat},${p.lon}`;
  return p;
}

function googleTravelMode(mode?: TravelMode | string | null): string {
  return mode === "cycling" ? "bicycling" : "driving";
}

export function googleMapsDirectionsUrl(opts: {
  origin: PlaceRef;
  destination: PlaceRef;
  waypoints?: LatLon[];
  mode?: TravelMode | string | null;
}): string {
  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("origin", placeParam(opts.origin));
  params.set("destination", placeParam(opts.destination));
  params.set("travelmode", googleTravelMode(opts.mode));

  if (isLatLon(opts.origin) && isLatLon(opts.destination)) {
    const origin = opts.origin;
    const destination = opts.destination;
    const mids = (opts.waypoints ?? []).filter(
      (w) =>
        Number.isFinite(w.lat) &&
        Number.isFinite(w.lon) &&
        !(w.lat === origin.lat && w.lon === origin.lon) &&
        !(w.lat === destination.lat && w.lon === destination.lon),
    );
    if (mids.length > 0) {
      params.set(
        "waypoints",
        mids.map((w) => `${w.lat},${w.lon}`).join("|"),
      );
    }
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Apple Maps directions (unified Maps URL).
 * Multi-stop via repeated `waypoint` — legacy `daddr=…+to:…` only opens the first stop.
 * @see https://developer.apple.com/documentation/mapkit/unified-map-urls
 */
export function appleMapsDirectionsUrl(opts: {
  origin: PlaceRef;
  destination: PlaceRef;
  waypoints?: LatLon[];
  mode?: TravelMode | string | null;
}): string {
  const url = new URL("https://maps.apple.com/directions");
  url.searchParams.set("source", placeParam(opts.origin));
  url.searchParams.set("destination", placeParam(opts.destination));
  url.searchParams.set("mode", opts.mode === "cycling" ? "walking" : "driving");

  if (isLatLon(opts.origin) && isLatLon(opts.destination)) {
    const origin = opts.origin;
    const destination = opts.destination;
    const mids = (opts.waypoints ?? []).filter(
      (w) =>
        Number.isFinite(w.lat) &&
        Number.isFinite(w.lon) &&
        !(w.lat === origin.lat && w.lon === origin.lon) &&
        !(w.lat === destination.lat && w.lon === destination.lon),
    );
    const capped = subsampleLatLon(mids, 8);
    for (const w of capped) {
      url.searchParams.append("waypoint", `${w.lat},${w.lon}`);
    }
  }

  return url.toString();
}

function subsampleLatLon(points: LatLon[], max: number): LatLon[] {
  if (points.length <= max) return points;
  if (max <= 1) return points.slice(0, max);
  const out: LatLon[] = [];
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i * (points.length - 1)) / (max - 1));
    out.push(points[idx]!);
  }
  return out;
}

export function weatherTripRouteShareUrl(opts: {
  apiBase: string;
  from: string;
  to: string;
  fromLat?: number | null;
  fromLon?: number | null;
  toLat?: number | null;
  toLon?: number | null;
  mode?: string | null;
  datePreset?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("from", opts.from);
  params.set("to", opts.to);
  params.set("origin", opts.from);
  if (opts.fromLat != null) params.set("fromLat", String(opts.fromLat));
  if (opts.fromLon != null) params.set("fromLon", String(opts.fromLon));
  if (opts.toLat != null) params.set("toLat", String(opts.toLat));
  if (opts.toLon != null) params.set("toLon", String(opts.toLon));
  if (opts.fromLat != null) params.set("lat", String(opts.fromLat));
  if (opts.fromLon != null) params.set("lon", String(opts.fromLon));
  params.set("mode", opts.mode ?? "driving");
  if (opts.datePreset) params.set("datePreset", opts.datePreset);
  if (opts.startDate) params.set("startDate", opts.startDate);
  if (opts.endDate) params.set("endDate", opts.endDate);
  const base = opts.apiBase.replace(/\/$/, "") || "https://solviax.app";
  return `${base}/routes?${params.toString()}`;
}
