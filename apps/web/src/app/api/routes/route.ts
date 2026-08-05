import { NextRequest, NextResponse } from "next/server";
import { routeQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { getRouteWeather } from "@/server/services/location-service";
import { resolveRouteDepartureWindow } from "@/server/dal/user-prefs";
import { gateRouteAccess } from "@/server/dal/route-gate";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: NextRequest) {
  return withApiLog(request, "routes", async ({ log, ip }) => {
    const limited = await rateLimit(`route:${ip}`, 30);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
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

    const gate = await gateRouteAccess({
      consume: true,
      clientKey: ip,
      meta: {
        from: parsed.data.from,
        to: parsed.data.to,
        mode: parsed.data.mode,
        path: "/api/routes",
      },
    });
    if (gate.paywalled) {
      log.warn(
        {
          from: parsed.data.from,
          to: parsed.data.to,
          remaining: gate.quota?.remaining ?? 0,
          kind: gate.quota?.kind,
        },
        "routes paywall",
      );
      return NextResponse.json(
        {
          error: "PAYWALL",
          message: "Route lookup limit reached.",
          quota: gate.quota,
        },
        { status: 402 },
      );
    }

    const departure = await resolveRouteDepartureWindow({
      startHour: parsed.data.departureStartHour,
      endHour: parsed.data.departureEndHour,
      earliestHour: parsed.data.earliestHour,
    });
    const route = await getRouteWeather(parsed.data.from, parsed.data.to, {
      fromLat: parsed.data.fromLat,
      fromLon: parsed.data.fromLon,
      toLat: parsed.data.toLat,
      toLon: parsed.data.toLon,
      mode: parsed.data.mode,
      prefer: parsed.data.prefer,
      altIndex: parsed.data.alt,
      datePreset: parsed.data.datePreset,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      locale: parsed.data.lang,
      departureStartHour: departure.startHour,
      departureEndHour: departure.endHour,
    });
    log.info(
      {
        mode: parsed.data.mode,
        prefer: parsed.data.prefer,
        departureStartHour: departure.startHour,
        departureEndHour: departure.endHour,
        waypoints: route.waypoints?.length ?? 0,
        alternatives: route.alternatives?.length ?? 0,
        remaining: gate.quota?.remaining,
      },
      "routes ok",
    );
    const headers: Record<string, string> = {};
    if (gate.quota) {
      headers["X-Quota-Remaining"] = String(gate.quota.remaining);
      headers["X-Quota-Limit"] = String(gate.quota.limit);
    }
    return NextResponse.json(route, { headers });
  });
}
