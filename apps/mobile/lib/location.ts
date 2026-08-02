import { Platform } from "react-native";
import * as Location from "expo-location";
import { apiGet } from "@/lib/api";
import type { PlaceDto } from "@/lib/types";
import type { Locale } from "@solviax/i18n";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("location");

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

const COORD_LABEL_RE = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

function looksLikeCoordinates(value: string | undefined | null): boolean {
  if (!value) return true;
  return COORD_LABEL_RE.test(value.trim());
}

function placeFromCoords(
  lat: number,
  lon: number,
  label: string | undefined,
  fallbackName: string,
): PlaceDto {
  const placeName =
    label && !looksLikeCoordinates(label) ? label : fallbackName;
  return {
    id: `gps-${lat.toFixed(4)},${lon.toFixed(4)}`,
    name:
      placeName === fallbackName
        ? fallbackName
        : placeName.split(",")[0]?.trim() || fallbackName,
    placeName,
    lat,
    lon,
  };
}

function placeFromAddress(
  lat: number,
  lon: number,
  addr: Location.LocationGeocodedAddress,
  fallbackName: string,
): PlaceDto | null {
  const name =
    addr.city ||
    addr.subregion ||
    addr.district ||
    addr.name ||
    addr.street ||
    addr.region;
  if (!name) return null;
  const placeName = [name, addr.region, addr.country].filter(Boolean).join(", ");
  return {
    id: `gps-rev-${lat.toFixed(4)},${lon.toFixed(4)}`,
    name,
    placeName: placeName || name || fallbackName,
    country: addr.country || undefined,
    lat,
    lon,
  };
}

async function readCoords(): Promise<{ lat: number; lon: number }> {
  // Browser geolocation is more reliable on Expo web than expo-location's
  // last-known / services checks (which can skip reverse and leave raw coords).
  if (Platform.OS === "web" && typeof navigator !== "undefined") {
    if (!navigator.geolocation) {
      throw new LocationDetectError("unavailable");
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(new LocationDetectError("denied"));
          } else if (err.code === err.TIMEOUT) {
            reject(new LocationDetectError("timeout"));
          } else {
            reject(new LocationDetectError("failed"));
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60_000 },
      );
    });
  }

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

async function reverseViaApi(
  lat: number,
  lon: number,
  locale: Locale,
): Promise<PlaceDto | null> {
  try {
    const data = await apiGet<{ place?: PlaceDto | null }>(
      "/api/geocode/reverse",
      { lat, lon, lang: locale },
    );
    const place = data.place;
    if (place?.lat == null || place?.lon == null) return null;
    const placeName = place.placeName || place.name;
    if (looksLikeCoordinates(placeName)) return null;
    return {
      id: place.id || `gps-${lat.toFixed(4)},${lon.toFixed(4)}`,
      name: place.name || placeName || "Here",
      placeName: placeName || place.name || "Here",
      country: place.country,
      lat: place.lat ?? lat,
      lon: place.lon ?? lon,
      kind: place.kind,
    };
  } catch {
    return null;
  }
}

async function reverseViaDevice(
  lat: number,
  lon: number,
  fallbackName: string,
): Promise<PlaceDto | null> {
  // Documented as iOS/Android only — skip on web to avoid noisy failures.
  if (Platform.OS === "web") return null;
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lon,
    });
    const first = results[0];
    if (!first) return null;
    return placeFromAddress(lat, lon, first, fallbackName);
  } catch {
    return null;
  }
}

/** IP / timezone coarse region — no GPS permission. */
export async function detectCoarsePlace(): Promise<CoarsePlaceResult> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  log.info({ tz, platform: Platform.OS }, "coarse locate start");
  const data = await apiGet<CoarsePlaceResult>("/api/geo/coarse", {
    tz: tz || undefined,
  });
  if (!data.place?.lat || !data.place?.lon) {
    log.warn("coarse locate missing place");
    throw new LocationDetectError("failed");
  }
  log.info(
    {
      name: data.place.name,
      source: data.source,
      suggestedDistance: data.suggestedDistance,
    },
    "coarse locate ok",
  );
  return data;
}

/**
 * Precise GPS + reverse geocode.
 * Always prefers a human place name for the origin field (never raw "lat, lon").
 */
export async function detectCurrentPlace(
  fallbackName = "Here",
  locale: Locale = "en",
): Promise<PlaceDto> {
  log.info({ platform: Platform.OS, locale }, "precise locate start");
  const { lat, lon } = await readCoords();
  log.debug({ lat, lon }, "precise coords");

  const fromApi = await reverseViaApi(lat, lon, locale);
  if (fromApi) {
    log.info({ name: fromApi.name, via: "api" }, "precise locate ok");
    return {
      ...fromApi,
      lat,
      lon,
    };
  }

  const fromDevice = await reverseViaDevice(lat, lon, fallbackName);
  if (fromDevice) {
    log.info({ name: fromDevice.name, via: "device" }, "precise locate ok");
    return fromDevice;
  }

  log.warn({ lat, lon }, "precise locate fallback name only");
  return placeFromCoords(lat, lon, undefined, fallbackName);
}
