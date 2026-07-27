import "server-only";

import {
  fetchWikipediaPlaceSummary,
  type WikipediaSummary,
} from "@/server/integrations/wikipedia";
import {
  readPlaceExtras,
  upsertPlaceExtrasFromWikipedia,
} from "@/server/dal/place-extras";

export async function getDestinationWikipediaSummary(input: {
  placeId: string;
  name: string;
  lat: number;
  lon: number;
  lang: "en" | "fi";
}): Promise<WikipediaSummary | null> {
  const extras = await readPlaceExtras(input.placeId);
  if (extras?.wikipediaUrl && extras.extractShort) {
    return {
      title: input.name,
      extract: extras.extractShort,
      thumbnailUrl: extras.thumbnailUrl ?? undefined,
      pageUrl: extras.wikipediaUrl,
      lang: extras.wikipediaLang ?? input.lang,
    };
  }

  const summary = await fetchWikipediaPlaceSummary({
    name: input.name,
    lat: input.lat,
    lon: input.lon,
    lang: input.lang,
  });

  if (summary) {
    void upsertPlaceExtrasFromWikipedia(input.placeId, summary).catch(() => {});
  }

  return summary;
}
