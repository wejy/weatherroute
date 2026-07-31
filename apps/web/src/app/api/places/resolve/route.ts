import { NextRequest, NextResponse } from "next/server";
import { placeResolveQuerySchema } from "@/lib/validation/schemas";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { resolveInternalPlace } from "@/server/dal/place-resolve";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await rateLimit(`place-resolve:${ip}`, 60);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
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

  return NextResponse.json({ place });
}
