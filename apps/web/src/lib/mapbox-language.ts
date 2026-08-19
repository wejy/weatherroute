import type { Map as MapboxMap } from "mapbox-gl";

const LANG_CACHE = Symbol("solviaxMapboxLangKey");

/** Mapbox Streets label language from app locale. */
export function mapboxLanguageCode(locale: string): "en" | "fi" {
  return locale === "fi" ? "fi" : "en";
}

function hasSetLanguage(
  map: MapboxMap,
): map is MapboxMap & { setLanguage: (language: string) => MapboxMap } {
  return typeof (map as MapboxMap & { setLanguage?: unknown }).setLanguage ===
    "function";
}

function currentMapLanguage(
  map: MapboxMap,
): string | string[] | null | undefined {
  return (
    map as MapboxMap & {
      getLanguage?: () => string | string[] | null | undefined;
    }
  ).getLanguage?.();
}

function mapLanguageMatches(
  current: string | string[] | null | undefined,
  expected: "en" | "fi",
): boolean {
  if (typeof current === "string") return current === expected;
  if (Array.isArray(current)) return current.includes(expected);
  return false;
}

/** Apply fi/en labels using Mapbox GL built-in language API. */
export function applyMapboxBasemapLanguage(map: MapboxMap, locale: string): boolean {
  if (!map.isStyleLoaded()) return false;
  if (!hasSetLanguage(map)) return false;
  const lang = mapboxLanguageCode(locale);
  if (mapLanguageMatches(currentMapLanguage(map), lang)) return true;
  map.setLanguage(lang);
  return true;
}

export type SyncMapboxBasemapLocaleOptions = {
  map: MapboxMap;
  locale: string;
  basemapStyle: string;
  onReady: () => void;
};

function markLocaleApplied(
  map: MapboxMap,
  cacheKey: string,
  applied: boolean,
): void {
  if (applied) {
    (map as MapboxMap & { [LANG_CACHE]?: string })[LANG_CACHE] = cacheKey;
  }
}

/** Apply fi/en basemap labels once per (basemapStyle, locale), then run onReady. */
export function syncMapboxBasemapLocale({
  map,
  locale,
  basemapStyle,
  onReady,
}: SyncMapboxBasemapLocaleOptions): void {
  const lang = mapboxLanguageCode(locale);
  const cacheKey = `${basemapStyle}:${lang}`;
  const cached = (map as MapboxMap & { [LANG_CACHE]?: string })[LANG_CACHE];

  if (cached === cacheKey) {
    onReady();
    return;
  }

  const run = () => {
    const applied = applyMapboxBasemapLanguage(map, locale);
    markLocaleApplied(map, cacheKey, applied);
    onReady();
  };

  if (!map.isStyleLoaded()) {
    map.once("style.load", () =>
      syncMapboxBasemapLocale({ map, locale, basemapStyle, onReady }),
    );
    return;
  }

  run();
}

export function clearMapboxBasemapLocaleCache(map: MapboxMap): void {
  delete (map as MapboxMap & { [LANG_CACHE]?: string })[LANG_CACHE];
}

/** Whether map language matches app locale (diagnostics / tests). */
export function isMapLanguageSynced(map: MapboxMap, locale: string): boolean {
  if (!hasSetLanguage(map)) return false;
  const current = (
    map as MapboxMap & { getLanguage?: () => string | string[] | null | undefined }
  ).getLanguage?.();
  const expected = mapboxLanguageCode(locale);
  if (typeof current === "string") return current === expected;
  if (Array.isArray(current)) return current.includes(expected);
  return false;
}
