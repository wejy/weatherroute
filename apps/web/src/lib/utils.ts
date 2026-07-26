import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DEFAULT_TRAVEL_MODE,
  type TravelMode,
} from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

/** Regional average speeds (km/h) for discover/map ETA previews — not Directions. */
export const TRAVEL_SPEED_KMH: Record<TravelMode, number> = {
  driving: 75,
  cycling: 16,
};

/**
 * Rough travel ETA from great-circle km for the selected mode.
 * Used for discover/map previews — not Mapbox Directions.
 */
export function estimateTravelMinutes(
  distanceKm: number,
  mode: TravelMode = DEFAULT_TRAVEL_MODE,
): number {
  const speed = TRAVEL_SPEED_KMH[mode] ?? TRAVEL_SPEED_KMH.driving;
  return Math.max(5, Math.round((Math.max(0, distanceKm) / speed) * 60));
}

/** @deprecated Prefer estimateTravelMinutes(distanceKm, mode) */
export function estimateDriveMinutes(distanceKm: number): number {
  return estimateTravelMinutes(distanceKm, "driving");
}

/** e.g. "20 min", "1 h", "1 h 10 min" */
export function formatTravelDuration(
  distanceKm: number,
  mode: TravelMode = DEFAULT_TRAVEL_MODE,
): string {
  const minutes = estimateTravelMinutes(distanceKm, mode);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours} h`;
  return `${hours} h ${rem} min`;
}

/** @deprecated Prefer formatTravelDuration(distanceKm, mode) */
export function formatDriveDuration(distanceKm: number): string {
  return formatTravelDuration(distanceKm, "driving");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
