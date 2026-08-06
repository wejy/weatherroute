import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { recordUsageEvent } from "@/server/dal/usage";
import { USAGE_TYPES } from "@/server/dal/usage-types";
import {
  classifyPlaceInstanceOf,
  coordsWithinKm,
} from "@/server/integrations/wikipedia/place-types";

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

/** Bump when resolution rules change so in-memory cache does not keep bad hits. */
const CACHE_VERSION = "v2";
const cache = new Map<
  string,
  { expiresAt: number; value: WikipediaSummary | null }
>();
const CACHE_TTL_MS = 60 * 60 * 1000;

const wikidataCache = new Map<
  string,
  { expiresAt: number; instanceOf: string[] }
>();
const WIKIDATA_TTL_MS = 24 * 60 * 60 * 1000;

/** Title/search hits may be in the same metro area. */
const SEARCH_NEAR_KM = 75;
/** Geosearch candidates must be close to the pin. */
const GEO_RADIUS_M = 5000;
const GEO_NEAR_KM = 8;
const GEO_LIMIT = 8;
const SEARCH_LIMIT = 5;

function cacheKey(lang: WikiLang, name: string, lat?: number, lon?: number) {
  const geo =
    lat != null && lon != null
      ? `${lat.toFixed(2)},${lon.toFixed(2)}`
      : "nogeo";
  return `${CACHE_VERSION}:${lang}:${name.trim().toLowerCase()}:${geo}`;
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
    coordinates?: { lat?: number; lon?: number };
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

async function fetchPageMeta(
  lang: WikiLang,
  title: string,
): Promise<{ qid: string | null; lat: number | null; lon: number | null }> {
  const params = new URLSearchParams({
    action: "query",
    prop: "pageprops|coordinates",
    titles: title,
    ppprop: "wikibase_item",
    colimit: "1",
    format: "json",
    origin: "*",
  });
  const res = await fetch(
    `https://${lang}.wikipedia.org/w/api.php?${params}`,
    { headers: wikiHeaders(), next: { revalidate: 3600 } },
  );
  if (!res.ok) return { qid: null, lat: null, lon: null };
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          pageprops?: { wikibase_item?: string };
          coordinates?: Array<{ lat?: number; lon?: number }>;
        }
      >;
    };
  };
  const page = Object.values(data.query?.pages ?? {})[0] as
    | {
        missing?: unknown;
        pageid?: number;
        pageprops?: { wikibase_item?: string };
        coordinates?: Array<{ lat?: number; lon?: number }>;
      }
    | undefined;
  if (
    !page ||
    page.missing !== undefined ||
    (typeof page.pageid === "number" && page.pageid < 0)
  ) {
    return { qid: null, lat: null, lon: null };
  }
  const coord = page.coordinates?.[0];
  return {
    qid: page.pageprops?.wikibase_item ?? null,
    lat: typeof coord?.lat === "number" ? coord.lat : null,
    lon: typeof coord?.lon === "number" ? coord.lon : null,
  };
}

async function fetchWikidataInstanceOf(qid: string): Promise<string[]> {
  const cached = wikidataCache.get(qid);
  if (cached && cached.expiresAt > Date.now()) return cached.instanceOf;

  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qid,
    props: "claims",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
    headers: wikiHeaders(),
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    entities?: Record<
      string,
      {
        claims?: {
          P31?: Array<{
            mainsnak?: { datavalue?: { value?: { id?: string } } };
          }>;
        };
      }
    >;
  };
  const claims = data.entities?.[qid]?.claims?.P31 ?? [];
  const instanceOf = claims
    .map((c) => c.mainsnak?.datavalue?.value?.id)
    .filter((id): id is string => Boolean(id));

  wikidataCache.set(qid, {
    instanceOf,
    expiresAt: Date.now() + WIKIDATA_TTL_MS,
  });
  return instanceOf;
}

/**
 * Prefer settlement / geography articles; reject people & companies.
 * When coords are available, also require proximity to the discover pin.
 */
async function isPlaceArticle(
  lang: WikiLang,
  title: string,
  near?: { lat: number; lon: number; maxKm: number },
): Promise<boolean> {
  const meta = await fetchPageMeta(lang, title);

  if (
    near &&
    meta.lat != null &&
    meta.lon != null &&
    !coordsWithinKm(near, { lat: meta.lat, lon: meta.lon }, near.maxKm)
  ) {
    return false;
  }

  if (meta.qid) {
    const instanceOf = await fetchWikidataInstanceOf(meta.qid);
    const verdict = classifyPlaceInstanceOf(instanceOf);
    if (verdict === "deny") return false;
    if (verdict === "allow") return true;
    // Unknown P31: accept only if geotagged near the pin.
    return Boolean(
      near &&
        meta.lat != null &&
        meta.lon != null &&
        coordsWithinKm(near, { lat: meta.lat, lon: meta.lon }, near.maxKm),
    );
  }

  // No Wikidata: accept geotagged pages near the pin only.
  return Boolean(
    near &&
      meta.lat != null &&
      meta.lon != null &&
      coordsWithinKm(near, { lat: meta.lat, lon: meta.lon }, near.maxKm),
  );
}

async function fetchSummaryIfPlace(
  lang: WikiLang,
  title: string,
  near?: { lat: number; lon: number; maxKm: number },
): Promise<WikipediaSummary | null> {
  const summary = await fetchSummary(lang, title);
  if (!summary) return null;
  if (!(await isPlaceArticle(lang, title, near))) {
    log.info({ lang, title }, "[wikipedia] rejected non-place article");
    return null;
  }
  return summary;
}

async function searchTitles(
  lang: WikiLang,
  query: string,
  limit: number,
): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    format: "json",
    origin: "*",
  });
  const res = await fetch(
    `https://${lang}.wikipedia.org/w/api.php?${params}`,
    { headers: wikiHeaders(), next: { revalidate: 3600 } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: { search?: Array<{ title?: string }> };
  };
  return (data.query?.search ?? [])
    .map((row) => row.title)
    .filter((t): t is string => Boolean(t));
}

async function geosearchTitles(
  lang: WikiLang,
  lat: number,
  lon: number,
): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "geosearch",
    gscoord: `${lat}|${lon}`,
    gsradius: String(GEO_RADIUS_M),
    gslimit: String(GEO_LIMIT),
    format: "json",
    origin: "*",
  });
  const res = await fetch(
    `https://${lang}.wikipedia.org/w/api.php?${params}`,
    { headers: wikiHeaders(), next: { revalidate: 3600 } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: { geosearch?: Array<{ title?: string }> };
  };
  return (data.query?.geosearch ?? [])
    .map((row) => row.title)
    .filter((t): t is string => Boolean(t));
}

function searchQueries(lang: WikiLang, title: string): string[] {
  const q = [title];
  if (lang === "fi") {
    q.push(`${title} (kaupunki)`, `${title} kunta`);
  } else {
    q.push(`${title} (city)`, `${title} city`);
  }
  return q;
}

async function resolveForLang(
  lang: WikiLang,
  name: string,
  lat?: number,
  lon?: number,
): Promise<WikipediaSummary | null> {
  const title = primaryTitle(name);
  const nearSearch =
    lat != null && lon != null
      ? { lat, lon, maxKm: SEARCH_NEAR_KM }
      : undefined;
  const nearGeo =
    lat != null && lon != null
      ? { lat, lon, maxKm: GEO_NEAR_KM }
      : undefined;

  const direct = await fetchSummaryIfPlace(lang, title, nearSearch);
  if (direct) return direct;

  const tried = new Set<string>([title.toLowerCase()]);
  for (const query of searchQueries(lang, title)) {
    const hits = await searchTitles(lang, query, SEARCH_LIMIT);
    for (const hit of hits) {
      const key = hit.toLowerCase();
      if (tried.has(key)) continue;
      tried.add(key);
      const fromSearch = await fetchSummaryIfPlace(lang, hit, nearSearch);
      if (fromSearch) return fromSearch;
    }
  }

  if (lat != null && lon != null) {
    const geoTitles = await geosearchTitles(lang, lat, lon);
    for (const geoTitle of geoTitles) {
      const key = geoTitle.toLowerCase();
      if (tried.has(key)) continue;
      tried.add(key);
      const fromGeo = await fetchSummaryIfPlace(lang, geoTitle, nearGeo);
      if (fromGeo) return fromGeo;
    }
  }

  return null;
}

/**
 * Best-effort Wikipedia place summary (image + short extract + page URL).
 * Tries requested language, then English fallback.
 * Filters out non-place Wikidata types; tightens geosearch radius.
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
