import "server-only";

import { placeholderImageFor } from "@/server/integrations/places/candidates";
import { mapboxStaticImageUrl } from "@/server/integrations/mapbox/static-image";
import { fetchWikipediaPlaceSummary } from "@/server/integrations/wikipedia";
import {
  readPlaceExtras,
  upsertPlaceExtrasFromWikipedia,
  upsertPlaceExtrasThumbnail,
} from "@/server/dal/place-extras";
import type { DateLocale } from "@/lib/dates";

const WIKI_FETCH_MS = 4500;
/** Avoid Wikipedia / Wikimedia 429 on cold discover. */
const WIKI_CONCURRENCY = 2;

function ensureHttps(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http://")) return `https://${url.slice("http://".length)}`;
  return url;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function mapboxFallbackUrl(lat: number, lon: number): string | null {
  // Smaller than hero to reduce Static Images bandwidth on discover grids.
  return mapboxStaticImageUrl(lat, lon, {
    width: 480,
    height: 320,
    zoom: 11,
  });
}

/**
 * Resolve a card/hero image for a destination.
 * Order: curated → place_extras → Wikipedia thumb → Mapbox Static → local placeholder.
 */
export async function resolveDestinationImageUrl(input: {
  id: string;
  name: string;
  placeName: string;
  lat: number;
  lon: number;
  locale?: DateLocale;
  curatedImageUrl?: string | null;
}): Promise<string> {
  if (input.curatedImageUrl) return input.curatedImageUrl;

  const extras = await readPlaceExtras(input.id);
  if (extras?.thumbnailUrl) {
    return ensureHttps(extras.thumbnailUrl);
  }

  const lang = input.locale === "fi" ? "fi" : "en";
  const summary = await withTimeout(
    fetchWikipediaPlaceSummary({
      name: input.name || input.placeName,
      lat: input.lat,
      lon: input.lon,
      lang,
    }),
    WIKI_FETCH_MS,
    null,
  );

  if (summary) {
    void upsertPlaceExtrasFromWikipedia(input.id, summary).catch(() => {
      /* place may not exist in DB (static CITY_INDEX ids) */
    });
    if (summary.thumbnailUrl) {
      return ensureHttps(summary.thumbnailUrl);
    }
  }

  const mapboxUrl = mapboxFallbackUrl(input.lat, input.lon);
  if (mapboxUrl) {
    void upsertPlaceExtrasThumbnail(input.id, mapboxUrl).catch(() => {
      /* place may not exist in DB */
    });
    return mapboxUrl;
  }

  return placeholderImageFor(input.id);
}

/** Enrich many destinations with limited Wikipedia concurrency. */
export async function enrichDestinationImages<
  T extends {
    id: string;
    name: string;
    placeName: string;
    lat: number;
    lon: number;
    imageUrl: string;
  },
>(
  destinations: T[],
  opts: {
    locale?: DateLocale;
    curatedById?: Map<string, { imageUrl?: string }>;
  },
): Promise<T[]> {
  if (destinations.length === 0) return destinations;

  const images = await mapPool(destinations, WIKI_CONCURRENCY, async (d) =>
    resolveDestinationImageUrl({
      id: d.id,
      name: d.name,
      placeName: d.placeName,
      lat: d.lat,
      lon: d.lon,
      locale: opts.locale,
      curatedImageUrl: opts.curatedById?.get(d.id)?.imageUrl,
    }),
  );

  return destinations.map((d, i) => ({
    ...d,
    imageUrl: images[i] ?? d.imageUrl,
  }));
}
