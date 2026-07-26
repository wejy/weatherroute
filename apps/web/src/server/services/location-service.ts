import "server-only";

import type { PlaceDto, RouteDto, TravelMode } from "@/lib/types";
import { DEFAULT_TRAVEL_MODE } from "@/lib/types";
import { MOCK_ROUTE, findPlace, haversineKm } from "@/server/integrations/mocks/data";
import {
  getMapboxRoute,
  searchPlaces,
} from "@/server/integrations/mapbox";
import { TRAVEL_SPEED_KMH } from "@/lib/utils";

function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function fallbackDurationLabel(distanceKm: number, mode: TravelMode): string {
  const speed = TRAVEL_SPEED_KMH[mode];
  const totalMinutes = Math.max(5, Math.round((distanceKm / speed) * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function pointAlong(
  geometry: [number, number][],
  t: number,
): { lon: number; lat: number } {
  if (geometry.length === 0) return { lon: 0, lat: 0 };
  const idx = Math.min(
    geometry.length - 1,
    Math.max(0, Math.round((geometry.length - 1) * t)),
  );
  const [lon, lat] = geometry[idx]!;
  return { lon, lat };
}

async function resolveEndpoint(
  query: string,
  coords?: { lat: number; lon: number },
): Promise<PlaceDto> {
  if (
    coords &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.lon)
  ) {
    return {
      id: `coord-${coords.lat.toFixed(5)},${coords.lon.toFixed(5)}`,
      name: query.split(",")[0]?.trim() || query,
      placeName: query,
      lat: coords.lat,
      lon: coords.lon,
      kind: "address",
    };
  }

  return (
    findPlace(query) ??
    (await searchPlaces(query, { limit: 1, mode: "precise" }))[0] ??
    MOCK_ROUTE.from
  );
}

export async function getRouteWeather(
  fromQuery: string,
  toQuery: string,
  opts?: {
    fromLat?: number;
    fromLon?: number;
    toLat?: number;
    toLon?: number;
    mode?: TravelMode;
  },
): Promise<RouteDto> {
  const mode = opts?.mode ?? DEFAULT_TRAVEL_MODE;
  const from = await resolveEndpoint(
    fromQuery,
    opts?.fromLat != null && opts?.fromLon != null
      ? { lat: opts.fromLat, lon: opts.fromLon }
      : undefined,
  );
  const to = await resolveEndpoint(
    toQuery,
    opts?.toLat != null && opts?.toLon != null
      ? { lat: opts.toLat, lon: opts.toLon }
      : undefined,
  );

  let routed: Awaited<ReturnType<typeof getMapboxRoute>> = null;
  try {
    routed = await getMapboxRoute(from, to, mode);
  } catch (error) {
    console.warn(`[route] Mapbox directions (${mode}) failed`, error);
  }

  const distanceKm = routed?.distanceKm ?? haversineKm(from, to);
  const durationLabel = routed
    ? formatDuration(routed.durationSeconds)
    : fallbackDurationLabel(distanceKm, mode);

  const mid = routed?.geometry?.length
    ? pointAlong(routed.geometry, 0.5)
    : {
        lat: (from.lat + to.lat) / 2,
        lon: (from.lon + to.lon) / 2,
      };

  if (
    !routed &&
    mode === "driving" &&
    from.name.toLowerCase().includes("helsinki") &&
    to.name.toLowerCase().includes("tampere")
  ) {
    return { ...MOCK_ROUTE, travelMode: mode };
  }

  return {
    id: `${from.id}-${to.id}-${mode}`,
    title: `${from.name} to ${to.name}`,
    from,
    to,
    distanceKm,
    durationLabel,
    travelMode: mode,
    dryTripGuarantee: 78 + (distanceKm % 15),
    bestDeparture: "09:30 AM",
    departureHint: `Leave mid-morning for the driest corridor between ${from.name} and ${to.name}.`,
    geometry: routed?.geometry,
    waypoints: [
      {
        name: from.name,
        role: "start",
        timeLabel: "09:30 AM • Start",
        lat: from.lat,
        lon: from.lon,
        temperatureC: 18,
        condition: "sunny",
        rainProbability: 5,
      },
      {
        name: "Midpoint",
        role: "midpoint",
        timeLabel: "11:00 AM • Midpoint",
        lat: mid.lat,
        lon: mid.lon,
        temperatureC: 17,
        condition: "cloudy",
        rainProbability: 20,
      },
      {
        name: to.name,
        role: "destination",
        timeLabel: "12:30 PM • Destination",
        lat: to.lat,
        lon: to.lon,
        temperatureC: 19,
        condition: "partly_cloudy",
        rainProbability: 10,
      },
    ],
  };
}
