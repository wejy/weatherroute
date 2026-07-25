import * as Location from "expo-location";
import { apiGet } from "@/lib/api";
import type { PlaceDto } from "@/lib/types";

export type LocationErrorCode = "denied" | "timeout" | "unavailable" | "failed";

export class LocationDetectError extends Error {
  code: LocationErrorCode;
  constructor(code: LocationErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export type CoarsePlaceResult = {
  place: PlaceDto;
  suggestedDistance?: "region" | "continent";
  region?: string;
  source?: string;
};

function placeFromCoords(lat: number, lon: number, label?: string): PlaceDto {
  return {
    id: `gps-${lat.toFixed(4)},${lon.toFixed(4)}`,
    name: label?.split(",")[0]?.trim() || "Here",
    placeName: label || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
    lat,
    lon,
  };
}

async function readCoords(): Promise<{ lat: number; lon: number }> {
  const services = await Location.hasServicesEnabledAsync();
  if (!services) {
    throw new LocationDetectError("unavailable");
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new LocationDetectError("denied");
  }

  const last = await Location.getLastKnownPositionAsync({
    maxAge: 5 * 60 * 1000,
    requiredAccuracy: 5000,
  });
  if (last?.coords) {
    return { lat: last.coords.latitude, lon: last.coords.longitude };
  }

  const fresh = await Promise.race([
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new LocationDetectError("timeout")), 15000);
    }),
  ]);

  return {
    lat: fresh.coords.latitude,
    lon: fresh.coords.longitude,
  };
}

/** IP / timezone coarse region — no GPS permission. */
export async function detectCoarsePlace(): Promise<CoarsePlaceResult> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const data = await apiGet<CoarsePlaceResult>("/api/geo/coarse", {
    tz: tz || undefined,
  });
  if (!data.place?.lat || !data.place?.lon) {
    throw new LocationDetectError("failed");
  }
  return data;
}

/** Precise GPS + reverse geocode. Falls back to coordinate label if reverse fails. */
export async function detectCurrentPlace(): Promise<PlaceDto> {
  const { lat, lon } = await readCoords();

  try {
    const data = await apiGet<{ place?: PlaceDto | null }>(
      "/api/geocode/reverse",
      { lat, lon },
    );
    const place = data.place;
    if (place?.lat != null && place?.lon != null) {
      return {
        id: place.id || `gps-${lat.toFixed(4)},${lon.toFixed(4)}`,
        name: place.name || "Here",
        placeName:
          place.placeName ||
          place.name ||
          `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
        country: place.country,
        lat: place.lat ?? lat,
        lon: place.lon ?? lon,
      };
    }
  } catch {
    // Network / API down — still return usable coords for discover.
  }

  return placeFromCoords(lat, lon);
}
