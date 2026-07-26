import { NextRequest, NextResponse } from "next/server";
import { wikipediaQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { fetchWikipediaPlaceSummary } from "@/server/integrations/wikipedia";
import {
  readPlaceExtras,
  upsertPlaceExtrasFromWikipedia,
} from "@/server/dal/place-extras";
import { getPlaceById } from "@/server/dal/places";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`wikipedia:${ip}`, 40);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = wikipediaQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, lat, lon, lang, placeId } = parsed.data;

  if (placeId) {
    const extras = await readPlaceExtras(placeId);
    if (extras?.wikipediaUrl && extras.extractShort) {
      return NextResponse.json({
        summary: {
          title: name,
          extract: extras.extractShort,
          thumbnailUrl: extras.thumbnailUrl ?? undefined,
          pageUrl: extras.wikipediaUrl,
          lang: extras.wikipediaLang ?? lang,
        },
        source: "place_extras",
      });
    }
  }

  const summary = await fetchWikipediaPlaceSummary({ name, lat, lon, lang });

  if (summary && placeId) {
    const place = await getPlaceById(placeId);
    if (place) {
      void upsertPlaceExtrasFromWikipedia(placeId, summary);
    }
  }

  return NextResponse.json({ summary, source: summary ? "live" : null });
}
