import { NextRequest, NextResponse } from "next/server";
import { wikipediaQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { getWikipediaSummaryForPlace } from "@/server/services/wikipedia-summary";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: NextRequest) {
  return withApiLog(request, "wikipedia", async ({ log, ip }) => {
    const limited = await rateLimit(`wikipedia:${ip}`, 40);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
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
    const result = await getWikipediaSummaryForPlace({
      name,
      lat,
      lon,
      lang,
      placeId,
    });

    log.info(
      {
        name,
        placeId: result.placeId,
        source: result.source,
        hit: Boolean(result.summary),
      },
      "wikipedia ok",
    );
    return NextResponse.json({
      summary: result.summary,
      source: result.source,
    });
  });
}
