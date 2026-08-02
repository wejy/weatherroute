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

/** Free/anon max preset — Region / Continent / Custom require Pro. */
export const FREE_MAX_DISTANCE_KEY = "neighborhood" as const satisfies DistanceKey;
export const FREE_MAX_RADIUS_KM = DISTANCE_RADIUS_KM[FREE_MAX_DISTANCE_KEY];

export const PRO_DISTANCE_KEYS = [
  "region",
  "continent",
  "custom",
] as const;

export function isProDistance(distance: string | undefined | null): boolean {
  return (
    distance === "region" ||
    distance === "continent" ||
    distance === "custom"
  );
}

export function clampDistanceForTier(
  distance: string | undefined | null,
  radiusKm: number | null | undefined,
  tier: "anon" | "free" | "pro",
): { distance: string; radiusKm?: number; clamped: boolean } {
  const requested = distance || FREE_MAX_DISTANCE_KEY;
  if (tier === "pro") {
    return {
      distance: requested,
      radiusKm: radiusKm ?? undefined,
      clamped: false,
    };
  }
  if (isProDistance(requested)) {
    return { distance: FREE_MAX_DISTANCE_KEY, clamped: true };
  }
  return {
    distance: requested,
    radiusKm: radiusKm ?? undefined,
    clamped: false,
  };
}

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
  return DISTANCE_RADIUS_KM[FREE_MAX_DISTANCE_KEY];
}

/** Matches web discover weather batch cap (anon). */
export const DISCOVER_WEATHER_CANDIDATE_LIMIT = 14;
