import type { PlaceDto } from "@/lib/types";

export {
  CITY_INDEX,
  WORLD_CITIES,
  citiesWithinRadius,
  candidateRankScore,
  type CityIndexEntry,
} from "@/server/integrations/places/city-index";

export {
  DISTANCE_RADIUS_KM,
  DISTANCE_PRESET_KEYS,
  CUSTOM_RADIUS_MIN_KM,
  CUSTOM_RADIUS_MAX_KM,
  CUSTOM_RADIUS_DEFAULT_KM,
  resolveRadiusKm,
  candidateLimitForRadius,
  DISCOVER_WEATHER_CANDIDATE_LIMIT,
  type DistanceKey,
} from "@/lib/distance";

const PLACEHOLDER_IMAGES = [
  "/images/naantali.jpg",
  "/images/stockholm.jpg",
  "/images/copenhagen.jpg",
];

export function placeholderImageFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 97;
  return PLACEHOLDER_IMAGES[hash % PLACEHOLDER_IMAGES.length]!;
}

/** Narrow PlaceDto helper for callers that don't need population. */
export type PlaceWithDistance = PlaceDto & { distanceKm: number };
