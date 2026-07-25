import "server-only";

import type { RouteDto } from "@/lib/types";
import { MOCK_ROUTE, findPlace, haversineKm } from "@/server/integrations/mocks/data";
import {
  getDrivingRoute,
  searchPlaces,
} from "@/server/integrations/mapbox";

function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
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

export async function getRouteWeather(
  fromQuery: string,
  toQuery: string,
): Promise<RouteDto> {
  const from =
    findPlace(fromQuery) ??
    (await searchPlaces(fromQuery, 1))[0] ??
    MOCK_ROUTE.from;
  const to =
    findPlace(toQuery) ??
    (await searchPlaces(toQuery, 1))[0] ??
    MOCK_ROUTE.to;

  let driving: Awaited<ReturnType<typeof getDrivingRoute>> = null;
  try {
    driving = await getDrivingRoute(from, to);
  } catch (error) {
    console.warn("[route] Mapbox directions failed", error);
  }

  const distanceKm = driving?.distanceKm ?? haversineKm(from, to);
  const durationLabel = driving
    ? formatDuration(driving.durationSeconds)
    : (() => {
        const hours = Math.max(1, Math.round(distanceKm / 80));
        const minutes = Math.round(((distanceKm / 80) % 1) * 60);
        return `${hours}h ${minutes}m`;
      })();

  const mid = driving?.geometry?.length
    ? pointAlong(driving.geometry, 0.5)
    : {
        lat: (from.lat + to.lat) / 2,
        lon: (from.lon + to.lon) / 2,
      };

  // Keep curated Helsinki→Tampere copy when directions aren't available.
  if (
    !driving &&
    from.name.toLowerCase().includes("helsinki") &&
    to.name.toLowerCase().includes("tampere")
  ) {
    return MOCK_ROUTE;
  }

  return {
    id: `${from.id}-${to.id}`,
    title: `${from.name} to ${to.name}`,
    from,
    to,
    distanceKm,
    durationLabel,
    dryTripGuarantee: 78 + (distanceKm % 15),
    bestDeparture: "09:30 AM",
    departureHint: `Leave mid-morning for the driest corridor between ${from.name} and ${to.name}.`,
    geometry: driving?.geometry,
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
