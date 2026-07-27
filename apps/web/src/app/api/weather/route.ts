import { NextRequest, NextResponse } from "next/server";
import { weatherQuerySchema } from "@/lib/validation/schemas";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { getWeatherForPlace } from "@/server/services/weather-service";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await rateLimit(`weather:${ip}`, 60);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = weatherQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { lang, ...rest } = parsed.data;
  const weather = await getWeatherForPlace({ ...rest, locale: lang });
  return NextResponse.json(weather);
}
