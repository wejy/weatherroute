export const DISTANCE_RADIUS_KM = {
  near: 30,
  semi: 60,
  surroundings: 120,
  neighborhood: 200,
  region: 300,
  continent: 1000,
} as const;

export type DistanceKey = keyof typeof DISTANCE_RADIUS_KM;

export const DISTANCE_PRESET_KEYS = Object.keys(
  DISTANCE_RADIUS_KM,
) as DistanceKey[];

export const CUSTOM_RADIUS_MIN_KM = 0;
export const CUSTOM_RADIUS_MAX_KM = 2000;
export const CUSTOM_RADIUS_DEFAULT_KM = 300;

export function resolveRadiusKm(
  distance: string | undefined,
  radiusKm?: number | null,
): number {
  if (distance === "custom") {
    const value = radiusKm ?? CUSTOM_RADIUS_DEFAULT_KM;
    return Math.min(
      CUSTOM_RADIUS_MAX_KM,
      Math.max(CUSTOM_RADIUS_MIN_KM, Math.round(value)),
    );
  }
  if (distance && distance in DISTANCE_RADIUS_KM) {
    return DISTANCE_RADIUS_KM[distance as DistanceKey];
  }
  return DISTANCE_RADIUS_KM.region;
}

/** Matches web discover weather batch cap. */
export const DISCOVER_WEATHER_CANDIDATE_LIMIT = 14;
