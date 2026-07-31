import type { TravelMode } from "@/lib/types";
import { withQuery } from "@/lib/discover-query";

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

/**
 * Google Maps directions URL from endpoints (+ optional midpoints).
 * Google recalculates its own path — we only pass stop points.
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function googleMapsDirectionsUrl(opts: {
  origin: PlaceRef;
  destination: PlaceRef;
  /** Midpoints along the corridor (order preserved). */
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

/** Absolute WeatherTrip `/routes` link with planning context. */
export function weatherTripRouteSharePath(opts: {
  from: string;
  to: string;
  fromLat?: number | null;
  fromLon?: number | null;
  toLat?: number | null;
  toLon?: number | null;
  fromId?: string | null;
  toId?: string | null;
  mode?: string | null;
  datePreset?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): string {
  return withQuery("/routes", {
    from: opts.from,
    to: opts.to,
    origin: opts.from,
    lat: opts.fromLat ?? undefined,
    lon: opts.fromLon ?? undefined,
    fromLat: opts.fromLat ?? undefined,
    fromLon: opts.fromLon ?? undefined,
    toLat: opts.toLat ?? undefined,
    toLon: opts.toLon ?? undefined,
    fromId: opts.fromId ?? undefined,
    toId: opts.toId ?? undefined,
    mode: opts.mode ?? "driving",
    datePreset: opts.datePreset ?? undefined,
    startDate: opts.startDate ?? undefined,
    endDate: opts.endDate ?? undefined,
  });
}
