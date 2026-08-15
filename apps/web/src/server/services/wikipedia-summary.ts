import "server-only";

import { isLinkableDestinationId } from "@/lib/discover-query";
import {
  fetchWikipediaPlaceSummary,
  type WikipediaSummary,
} from "@/server/integrations/wikipedia";
import {
  readPlaceExtras,
  upsertPlaceExtrasFromWikipedia,
} from "@/server/dal/place-extras";
import { findPlaceNear, getPlaceById } from "@/server/dal/places";

export type WikipediaSummarySource = "place_extras" | "live";

function summaryFromExtras(
  name: string,
  lang: "en" | "fi",
  extras: {
    wikipediaUrl: string | null;
    wikipediaLang: string | null;
    thumbnailUrl: string | null;
    extractShort: string | null;
  },
): WikipediaSummary | null {
  if (!extras.wikipediaUrl || !extras.extractShort) return null;
  // Lang-specific row: skip when we already stored a different language.
  if (extras.wikipediaLang && extras.wikipediaLang !== lang) return null;
  return {
    title: name,
    extract: extras.extractShort,
    thumbnailUrl: extras.thumbnailUrl ?? undefined,
    pageUrl: extras.wikipediaUrl,
    lang: extras.wikipediaLang ?? lang,
  };
}

/** Resolve a durable place id for place_extras (explicit id or near lat/lon). */
export async function resolveWikipediaPlaceId(input: {
  placeId?: string;
  name: string;
  lat?: number;
  lon?: number;
}): Promise<string | null> {
  if (input.placeId && isLinkableDestinationId(input.placeId)) {
    const row = await getPlaceById(input.placeId);
    if (row) return row.id;
  }
  if (input.lat == null || input.lon == null) return null;
  const near = await findPlaceNear({
    lat: input.lat,
    lon: input.lon,
    name: input.name,
  });
  return near?.id ?? null;
}

/**
 * Wikipedia summary with place_extras DB cache, then live Wikimedia.
 * Persists successful live hits when a catalog place id can be resolved.
 */
export async function getWikipediaSummaryForPlace(input: {
  name: string;
  lat?: number;
  lon?: number;
  lang: "en" | "fi";
  placeId?: string;
}): Promise<{
  summary: WikipediaSummary | null;
  source: WikipediaSummarySource | null;
  placeId: string | null;
}> {
  const placeId = await resolveWikipediaPlaceId(input);

  if (placeId) {
    const extras = await readPlaceExtras(placeId);
    if (extras) {
      const cached = summaryFromExtras(input.name, input.lang, extras);
      if (cached) {
        return { summary: cached, source: "place_extras", placeId };
      }
    }
  }

  const summary = await fetchWikipediaPlaceSummary({
    name: input.name,
    lat: input.lat,
    lon: input.lon,
    lang: input.lang,
  });

  if (summary && placeId) {
    void upsertPlaceExtrasFromWikipedia(placeId, summary).catch(() => {
      /* place may be CITY_INDEX-only without DB row */
    });
  }

  return {
    summary,
    source: summary ? "live" : null,
    placeId,
  };
}
