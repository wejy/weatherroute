import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

/**
 * Rough driving ETA from great-circle km (regional average ~75 km/h).
 * Used for discover/map previews — not Mapbox Directions.
 */
export function estimateDriveMinutes(distanceKm: number): number {
  return Math.max(5, Math.round((Math.max(0, distanceKm) / 75) * 60));
}

/** e.g. "20 min", "1 h", "1 h 10 min" */
export function formatDriveDuration(distanceKm: number): string {
  const minutes = estimateDriveMinutes(distanceKm);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours} h`;
  return `${hours} h ${rem} min`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
