"use client";

import { isLinkableDestinationId } from "@/lib/discover-query";

export type WikipediaSummaryClient = {
  title: string;
  extract: string;
  description?: string;
  thumbnailUrl?: string;
  pageUrl: string;
  lang: string;
};

type CacheEntry =
  | { status: "ready"; summary: WikipediaSummaryClient }
  | { status: "empty" };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<WikipediaSummaryClient | null>>();

export function wikipediaCacheKey(
  name: string,
  lat: number,
  lon: number,
  lang: string,
  placeId?: string,
): string {
  if (placeId && isLinkableDestinationId(placeId)) {
    return `${lang}:id:${placeId}`;
  }
  return `${lang}:${name.trim().toLowerCase()}:${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export function getCachedWikipedia(
  key: string,
): CacheEntry | undefined {
  return cache.get(key);
}

export async function fetchWikipediaSummary(input: {
  name: string;
  lat: number;
  lon: number;
  lang: "en" | "fi";
  placeId?: string;
}): Promise<WikipediaSummaryClient | null> {
  const placeId =
    input.placeId && isLinkableDestinationId(input.placeId)
      ? input.placeId
      : undefined;
  const key = wikipediaCacheKey(
    input.name,
    input.lat,
    input.lon,
    input.lang,
    placeId,
  );
  const hit = cache.get(key);
  if (hit) return hit.status === "ready" ? hit.summary : null;

  const pending = inflight.get(key);
  if (pending) return pending;

  const params = new URLSearchParams({
    name: input.name,
    lang: input.lang,
    lat: String(input.lat),
    lon: String(input.lon),
  });
  if (placeId) params.set("placeId", placeId);

  const promise = fetch(`/api/wikipedia?${params}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Promise<{ summary: WikipediaSummaryClient | null }>;
    })
    .then((data) => {
      if (data.summary) {
        cache.set(key, { status: "ready", summary: data.summary });
        return data.summary;
      }
      cache.set(key, { status: "empty" });
      return null;
    })
    .catch(() => {
      // Don't poison cache on transient network errors — allow retry.
      return null;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Staggered background prefetch for map markers (~8 places).
 * Passes placeId so the server can hit place_extras / persist results.
 */
export function prefetchWikipediaForMarkers(
  places: Array<{
    name: string;
    lat: number;
    lon: number;
    placeId?: string;
  }>,
  lang: "en" | "fi",
  options?: { staggerMs?: number; signal?: AbortSignal },
): void {
  const staggerMs = options?.staggerMs ?? 220;
  const signal = options?.signal;
  const timers: number[] = [];

  const clearTimers = () => {
    for (const id of timers) window.clearTimeout(id);
    timers.length = 0;
  };
  signal?.addEventListener("abort", clearTimers, { once: true });

  places.forEach((place, index) => {
    const key = wikipediaCacheKey(
      place.name,
      place.lat,
      place.lon,
      lang,
      place.placeId,
    );
    if (cache.has(key) || inflight.has(key)) return;

    const delay = 80 + index * staggerMs;
    const id = window.setTimeout(() => {
      if (signal?.aborted) return;
      void fetchWikipediaSummary({ ...place, lang });
    }, delay);
    timers.push(id);
  });
}
