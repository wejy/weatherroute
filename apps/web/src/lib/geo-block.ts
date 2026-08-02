/**
 * Country / territory blocks for search, discover, and destinations.
 * Kept in a shared lib so client-safe helpers stay free of server-only imports.
 */

const BLOCKED_COUNTRY_CODES = new Set(["RU"]);

const BLOCKED_COUNTRY_NAMES = new Set([
  "russia",
  "russian federation",
  "venäjä",
  "venaja",
  "россия",
  "российская федерация",
]);

export function isBlockedCountryCode(
  code: string | null | undefined,
): boolean {
  if (!code) return false;
  return BLOCKED_COUNTRY_CODES.has(code.trim().toUpperCase());
}

export function isBlockedCountryName(
  name: string | null | undefined,
): boolean {
  if (!name) return false;
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return BLOCKED_COUNTRY_NAMES.has(normalized);
}

/** True when a place should not appear in search, discover, or destinations. */
export function isBlockedPlace(place: {
  country?: string | null;
  countryCode?: string | null;
  placeName?: string | null;
}): boolean {
  if (isBlockedCountryCode(place.countryCode)) return true;
  if (isBlockedCountryName(place.country)) return true;
  // Fallback when country fields are missing but placeName ends with ", Russia"
  const placeName = place.placeName?.trim();
  if (placeName) {
    const tail = placeName.split(",").pop()?.trim();
    if (tail && isBlockedCountryName(tail)) return true;
  }
  return false;
}

export function filterBlockedPlaces<T extends {
  country?: string | null;
  countryCode?: string | null;
  placeName?: string | null;
}>(places: T[]): T[] {
  return places.filter((p) => !isBlockedPlace(p));
}

/** Åland (AX) treated as Finland for “same country” discover filtering. */
export function normalizeCountryCode(code: string): string {
  const upper = code.trim().toUpperCase();
  if (upper === "AX") return "FI";
  return upper;
}

/** ISO codes that match the same “country group” for discover filtering. */
export function countryCodeMatchSet(code: string): string[] {
  const normalized = normalizeCountryCode(code);
  if (normalized === "FI") return ["FI", "AX"];
  return [normalized];
}

export function isSameCountryCode(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return normalizeCountryCode(a) === normalizeCountryCode(b);
}
