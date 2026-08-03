import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { recordUsageEvent } from "@/server/dal/usage";
import { USAGE_TYPES } from "@/server/dal/usage-types";

const log = createModuleLogger("server.integrations.wikipedia");
export type WikipediaSummary = {
  title: string;
  extract: string;
  description?: string;
  thumbnailUrl?: string;
  pageUrl: string;
  lang: string;
};

type WikiLang = "en" | "fi";

const UA =
  "Solviax.app/0.1 (demo weather travel app; local-dev; https://github.com/solviax)";

const cache = new Map<
  string,
  { expiresAt: number; value: WikipediaSummary | null }
>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function cacheKey(lang: WikiLang, name: string, lat?: number, lon?: number) {
  const geo =
    lat != null && lon != null
      ? `${lat.toFixed(2)},${lon.toFixed(2)}`
      : "nogeo";
  return `${lang}:${name.trim().toLowerCase()}:${geo}`;
}

function wikiHeaders(): HeadersInit {
  return {
    "User-Agent": UA,
    Accept: "application/json",
  };
}

function primaryTitle(name: string): string {
  // "Potsdam, Germany" → "Potsdam"
  return name.split(",")[0]?.trim() || name.trim();
}

async function fetchSummary(
  lang: WikiLang,
  title: string,
): Promise<WikipediaSummary | null> {
  const encoded = encodeURIComponent(title.replaceAll(" ", "_"));
  const res = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    {
      headers: wikiHeaders(),
      next: { revalidate: 3600 },
    },
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    log.warn(`[wikipedia] summary ${lang}/${title} → ${res.status}`);
    return null;
  }

  const data = (await res.json()) as {
    type?: string;
    title?: string;
    extract?: string;
    description?: string;
    thumbnail?: { source?: string };
    content_urls?: { desktop?: { page?: string } };
    lang?: string;
  };

  // Disambiguation / special pages usually lack a useful extract.
  if (data.type === "disambiguation" || !data.extract?.trim()) {
    return null;
  }

  const pageUrl =
    data.content_urls?.desktop?.page ??
    `https://${lang}.wikipedia.org/wiki/${encoded}`;

  return {
    title: data.title ?? title,
    extract: data.extract.trim(),
    description: data.description?.trim() || undefined,
    thumbnailUrl: data.thumbnail?.source,
    pageUrl,
    lang: data.lang ?? lang,
  };
}

async function searchTitle(
  lang: WikiLang,
  query: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "1",
    format: "json",
    origin: "*",
  });
  const res = await fetch(
    `https://${lang}.wikipedia.org/w/api.php?${params}`,
    { headers: wikiHeaders(), next: { revalidate: 3600 } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: { search?: Array<{ title?: string }> };
  };
  return data.query?.search?.[0]?.title ?? null;
}

async function geosearchTitle(
  lang: WikiLang,
  lat: number,
  lon: number,
): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "geosearch",
    gscoord: `${lat}|${lon}`,
    gsradius: "10000",
    gslimit: "1",
    format: "json",
    origin: "*",
  });
  const res = await fetch(
    `https://${lang}.wikipedia.org/w/api.php?${params}`,
    { headers: wikiHeaders(), next: { revalidate: 3600 } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: { geosearch?: Array<{ title?: string }> };
  };
  return data.query?.geosearch?.[0]?.title ?? null;
}

async function resolveForLang(
  lang: WikiLang,
  name: string,
  lat?: number,
  lon?: number,
): Promise<WikipediaSummary | null> {
  const title = primaryTitle(name);

  const direct = await fetchSummary(lang, title);
  if (direct) return direct;

  const searched = await searchTitle(lang, title);
  if (searched) {
    const fromSearch = await fetchSummary(lang, searched);
    if (fromSearch) return fromSearch;
  }

  if (lat != null && lon != null) {
    const geoTitle = await geosearchTitle(lang, lat, lon);
    if (geoTitle) {
      const fromGeo = await fetchSummary(lang, geoTitle);
      if (fromGeo) return fromGeo;
    }
  }

  return null;
}

/**
 * Best-effort Wikipedia place summary (image + short extract + page URL).
 * Tries requested language, then English fallback.
 */
export async function fetchWikipediaPlaceSummary(input: {
  name: string;
  lat?: number;
  lon?: number;
  lang?: WikiLang;
}): Promise<WikipediaSummary | null> {
  const lang: WikiLang = input.lang === "fi" ? "fi" : "en";
  const name = input.name.trim();
  if (!name) return null;

  const key = cacheKey(lang, name, input.lat, input.lon);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let value: WikipediaSummary | null = null;
  try {
    value = await resolveForLang(lang, name, input.lat, input.lon);
    if (!value && lang !== "en") {
      value = await resolveForLang("en", name, input.lat, input.lon);
    }
    recordUsageEvent({
      type: USAGE_TYPES.extWikipedia,
      meta: { lang },
    });
  } catch (error) {
    log.warn({ err: error }, "[wikipedia] fetch failed");
    value = null;
  }

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
