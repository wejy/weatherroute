import "server-only";

import type { RouteDto } from "@/lib/types";
import { MOCK_ROUTE, findPlace, haversineKm } from "@/server/integrations/mocks/data";
import { searchPlaces } from "@/server/integrations/mapbox";

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

  if (
    from.name.toLowerCase().includes("helsinki") &&
    to.name.toLowerCase().includes("tampere")
  ) {
    return MOCK_ROUTE;
  }

  const distanceKm = haversineKm(from, to);
  const hours = Math.max(1, Math.round(distanceKm / 80));
  const minutes = Math.round(((distanceKm / 80) % 1) * 60);

  return {
    id: `${from.id}-${to.id}`,
    title: `${from.name} to ${to.name}`,
    from,
    to,
    distanceKm,
    durationLabel: `${hours}h ${minutes}m`,
    dryTripGuarantee: 78 + (distanceKm % 15),
    bestDeparture: "09:30 AM",
    departureHint: `Leave mid-morning for the driest corridor between ${from.name} and ${to.name}.`,
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
        lat: (from.lat + to.lat) / 2,
        lon: (from.lon + to.lon) / 2,
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
