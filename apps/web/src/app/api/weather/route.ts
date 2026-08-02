import { NextRequest, NextResponse } from "next/server";
import { weatherQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { getWeatherForPlace } from "@/server/services/weather-service";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: NextRequest) {
  return withApiLog(request, "weather", async ({ log, ip }) => {
    const limited = await rateLimit(`weather:${ip}`, 60);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
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
    log.info(
      {
        lat: rest.lat,
        lon: rest.lon,
        provider: weather.provider,
        days: weather.daily.length,
      },
      "weather ok",
    );
    return NextResponse.json(weather);
  });
}
