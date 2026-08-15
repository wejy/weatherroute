import "server-only";

import { getWikipediaSummaryForPlace } from "@/server/services/wikipedia-summary";
import type { WikipediaSummary } from "@/server/integrations/wikipedia";

export async function getDestinationWikipediaSummary(input: {
  placeId: string;
  name: string;
  lat: number;
  lon: number;
  lang: "en" | "fi";
}): Promise<WikipediaSummary | null> {
  const { summary } = await getWikipediaSummaryForPlace(input);
  return summary;
}
