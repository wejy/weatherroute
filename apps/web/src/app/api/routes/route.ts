import { NextRequest, NextResponse } from "next/server";
import { routeQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { getRouteWeather } from "@/server/services/location-service";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`route:${ip}`, 30);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = routeQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const route = await getRouteWeather(parsed.data.from, parsed.data.to, {
    fromLat: parsed.data.fromLat,
    fromLon: parsed.data.fromLon,
    toLat: parsed.data.toLat,
    toLon: parsed.data.toLon,
    mode: parsed.data.mode,
    prefer: parsed.data.prefer,
    altIndex: parsed.data.alt,
    locale: parsed.data.lang,
  });
  return NextResponse.json(route);
}
