import "server-only";

import type {
  DestinationDto,
  DiscoverResultDto,
  MapMarkerDto,
  SuitabilityBadgeDto,
  WeatherDto,
  WeatherGoal,
  DistanceRange,
} from "@/lib/types";
import type { DiscoverQuery } from "@/lib/validation/schemas";
import { fetchWeather } from "@/server/integrations/weather";
import { reverseGeocode, searchPlaces } from "@/server/integrations/mapbox";
import {
  DESTINATION_CATALOG,
  findPlace,
  haversineKm,
  PLACES,
} from "@/server/integrations/mocks/data";

const DISTANCE_MAX_KM: Record<DistanceRange, number> = {
  near: 50,
  region: 300,
  country: 900,
  continent: 2500,
  global: 20000,
};

function scoreDestination(dest: DestinationDto, goal: WeatherGoal): number {
  switch (goal) {
    case "sun":
      return dest.sunshineScore - dest.rainProbability;
    case "dry":
      return 100 - dest.rainProbability;
    case "mild":
      return 100 - Math.abs(dest.temperatureC - 20) * 5;
    case "warm":
      return dest.temperatureC * 3 + dest.sunshineScore / 2;
    case "calm":
      return 80 - dest.rainProbability + (dest.condition === "cloudy" ? 10 : 0);
    case "cloudy":
      return dest.condition === "cloudy" || dest.condition === "partly_cloudy"
        ? 90
        : 40;
    default:
      return dest.sunshineScore;
  }
}

export async function discoverDestinations(
  query: DiscoverQuery,
): Promise<DiscoverResultDto> {
  let origin = findPlace(query.origin ?? "Helsinki");

  if (!origin && query.lat != null && query.lon != null) {
    origin = await reverseGeocode(query.lat, query.lon);
  }

  if (!origin) {
    const matches = await searchPlaces(query.origin ?? "Helsinki", 1);
    origin = matches[0] ?? PLACES[0];
  }

  const maxKm = DISTANCE_MAX_KM[query.distance ?? "region"];
  const goal = query.weatherGoal ?? "sun";

  const destinations = DESTINATION_CATALOG.map((d) => ({
    ...d,
    distanceKm: haversineKm(origin!, d),
  }))
    .filter((d) => d.distanceKm <= maxKm || query.distance === "global")
    .map((d) => ({ d, score: scoreDestination(d, goal) }))
    .sort((a, b) => b.score - a.score)
    .map(({ d }) => d);

  const mapMarkers: MapMarkerDto[] = [
    ...destinations.slice(0, 6).map((d) => ({
      id: d.id,
      name: d.name,
      lat: d.lat,
      lon: d.lon,
      temperatureC: d.temperatureC,
      condition: d.condition,
      tomorrowTempC: d.temperatureC + 1,
    })),
    {
      id: "helsinki-marker",
      name: "Helsinki",
      lat: 60.1699,
      lon: 24.9384,
      temperatureC: 22,
      condition: "partly_cloudy",
      tomorrowTempC: 24,
    },
    {
      id: "oslo-marker",
      name: "Oslo",
      lat: 59.9139,
      lon: 10.7522,
      temperatureC: 18,
      condition: "cloudy",
      tomorrowTempC: 19,
    },
  ];

  return {
    origin,
    weatherGoal: goal,
    distance: query.distance ?? "region",
    datePreset: query.datePreset ?? "weekend",
    destinations,
    mapMarkers,
  };
}

export async function getWeatherForPlace(input: {
  lat: number;
  lon: number;
  name?: string;
}): Promise<WeatherDto> {
  return fetchWeather(input);
}

export function buildSuitability(weather: WeatherDto): SuitabilityBadgeDto[] {
  const badges: SuitabilityBadgeDto[] = [];
  const { current, daily } = weather;

  if (current.precipitationProbability < 20 && current.windSpeedKmh < 20) {
    badges.push({
      id: "bbq",
      tone: "success",
      icon: "outdoor_grill",
      title: "Perfect for Outdoor BBQ",
      description: "Low wind, no rain expected today.",
    });
  }

  if (current.visibilityKm >= 8 && current.precipitationProbability < 40) {
    badges.push({
      id: "drive",
      tone: "info",
      icon: "directions_car",
      title: "Safe for Driving",
      description: "Excellent visibility, dry roads.",
    });
  }

  const wetDay = daily.find((d) => d.precipitationProbability >= 50);
  if (wetDay) {
    badges.push({
      id: "umbrella",
      tone: "warning",
      icon: "umbrella",
      title: `Bring an Umbrella ${wetDay.dayLabel}`,
      description: `${wetDay.precipitationProbability}% chance of heavy showers.`,
    });
  }

  return badges;
}

export async function getDestinationBySlug(slug: string) {
  return DESTINATION_CATALOG.find((d) => d.slug === slug || d.id === slug);
}
