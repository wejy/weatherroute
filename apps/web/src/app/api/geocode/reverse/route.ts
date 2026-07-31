import { NextRequest, NextResponse } from "next/server";
import { reverseQuerySchema } from "@/lib/validation/schemas";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { reverseGeocode } from "@/server/integrations/mapbox";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await rateLimit(`reverse:${ip}`, 20);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = reverseQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const place = await reverseGeocode(
    parsed.data.lat,
    parsed.data.lon,
    parsed.data.lang,
  );
  return NextResponse.json({ place });
}
