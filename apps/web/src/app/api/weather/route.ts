import { NextRequest, NextResponse } from "next/server";
import { weatherQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import {
  buildSuitability,
  getWeatherForPlace,
} from "@/server/services/weather-service";
import { withApiLog } from "@/lib/api-log";
import { resolveDateWindow } from "@/lib/dates";
import { getDictionary } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";

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

    const { lang, datePreset, startDate, endDate, ...rest } = parsed.data;
    const weather = await getWeatherForPlace({ ...rest, locale: lang });
    const window = resolveDateWindow({
      preset: datePreset ?? (startDate ? "custom" : "weekend"),
      startDate,
      endDate: endDate ?? startDate,
      locale: lang,
    });
    const t = createTranslator(getDictionary(lang));
    const suitability = buildSuitability(weather, t, lang, {
      startDate: window.startDate,
      endDate: window.endDate,
    });
    log.info(
      {
        lat: rest.lat,
        lon: rest.lon,
        provider: weather.provider,
        days: weather.daily.length,
        suitability: suitability.length,
      },
      "weather ok",
    );
    return NextResponse.json({ ...weather, suitability });
  });
}
