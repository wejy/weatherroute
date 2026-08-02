import { NextRequest, NextResponse } from "next/server";
import { searchQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { searchPlaces } from "@/server/integrations/mapbox";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: NextRequest) {
  return withApiLog(request, "search", async ({ log, ip }) => {
    const limited = await rateLimit(`search:${ip}`, 40);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const parsed = searchQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { q, limit, mode, lang, proximityLat, proximityLon } = parsed.data;
    const places = await searchPlaces(q, {
      limit,
      mode,
      lang,
      proximity:
        proximityLat != null && proximityLon != null
          ? { lat: proximityLat, lon: proximityLon }
          : undefined,
    });
    log.info(
      { qLen: q.length, mode, results: places.length },
      "search ok",
    );
    return NextResponse.json({ results: places });
  });
}
