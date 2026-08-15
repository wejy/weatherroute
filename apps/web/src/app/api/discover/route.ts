import { NextRequest, NextResponse } from "next/server";
import { discoverQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { discoverDestinations } from "@/server/services/weather-service";
import { getLocale } from "@/i18n/get-dictionary";
import {
  gateDiscoverAccess,
  isActiveDiscoverQuery,
} from "@/server/dal/discover-gate";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: NextRequest) {
  return withApiLog(request, "discover", async ({ log, ip }) => {
    const limited = await rateLimit(`discover:${ip}`, 30);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const parsed = discoverQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const active = isActiveDiscoverQuery(parsed.data);
    const gate = await gateDiscoverAccess({
      consume: active,
      clientKey: ip,
      meta: {
        origin: parsed.data.origin,
        weatherGoal: parsed.data.weatherGoal,
        path: "/api/discover",
        ...(Number.isFinite(parsed.data.lat) &&
        Number.isFinite(parsed.data.lon)
          ? { lat: parsed.data.lat, lon: parsed.data.lon }
          : {}),
      },
    });

    if (gate.paywalled) {
      log.warn(
        {
          origin: parsed.data.origin,
          weatherGoal: parsed.data.weatherGoal,
          remaining: gate.quota?.remaining ?? 0,
        },
        "discover paywall",
      );
      return NextResponse.json(
        {
          error: "PAYWALL",
          message: "Anonymous discover limit reached. Sign in to continue.",
          quota: gate.quota,
        },
        { status: 402 },
      );
    }

    const locale =
      parsed.data.lang ?? ((await getLocale()) === "fi" ? "fi" : "en");
    const result = await discoverDestinations(parsed.data, locale);
    log.info(
      {
        origin: parsed.data.origin,
        weatherGoal: parsed.data.weatherGoal,
        distance: parsed.data.distance,
        destinations: result.destinations.length,
        consumed: active,
        remaining: gate.quota?.remaining,
      },
      "discover ok",
    );

    const headers: Record<string, string> = {};
    if (gate.quota) {
      headers["X-Quota-Remaining"] = String(gate.quota.remaining);
      headers["X-Quota-Limit"] = String(gate.quota.limit);
    }
    return NextResponse.json(result, { headers });
  });
}
