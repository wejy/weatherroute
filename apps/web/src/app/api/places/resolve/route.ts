import { NextRequest, NextResponse } from "next/server";
import { placeResolveQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { resolveInternalPlace } from "@/server/dal/place-resolve";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: NextRequest) {
  return withApiLog(request, "places.resolve", async ({ log, ip }) => {
    const limited = await rateLimit(`place-resolve:${ip}`, 60);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const parsed = placeResolveQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { lat, lon, name, placeName, id } = parsed.data;
    const place = await resolveInternalPlace({
      lat,
      lon,
      name,
      placeName,
      id,
    });

    log.info(
      { resolvedId: place?.id ?? null, name: place?.name ?? name },
      "place resolve ok",
    );
    return NextResponse.json({ place });
  });
}
