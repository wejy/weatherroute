import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { placeExtras, places } from "@/db/schema";
import type { WikipediaSummary } from "@/server/integrations/wikipedia";

export async function readPlaceExtras(placeId: string) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(placeExtras)
    .where(eq(placeExtras.placeId, placeId))
    .limit(1);
  return row ?? null;
}

export async function upsertPlaceExtrasFromWikipedia(
  placeId: string,
  summary: WikipediaSummary,
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const [place] = await db
    .select({ id: places.id })
    .from(places)
    .where(eq(places.id, placeId))
    .limit(1);
  if (!place) return;

  await db
    .insert(placeExtras)
    .values({
      placeId,
      wikipediaUrl: summary.pageUrl,
      wikipediaLang: summary.lang,
      thumbnailUrl: summary.thumbnailUrl ?? null,
      extractShort: summary.extract.slice(0, 600),
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: placeExtras.placeId,
      set: {
        wikipediaUrl: summary.pageUrl,
        wikipediaLang: summary.lang,
        thumbnailUrl: summary.thumbnailUrl ?? null,
        extractShort: summary.extract.slice(0, 600),
        fetchedAt: new Date(),
      },
    });
}
