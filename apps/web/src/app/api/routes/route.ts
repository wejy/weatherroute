import { NextRequest, NextResponse } from "next/server";
import { routeQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { getRouteWeather } from "@/server/services/location-service";
import { resolveRouteEarliestHour } from "@/server/dal/user-prefs";
import { withApiLog } from "@/lib/api-log";
import { getCurrentUser } from "@/server/auth/session";
import { recordUsageEvent } from "@/server/dal/usage";
import { USAGE_TYPES } from "@/server/dal/usage-types";

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

    const departure = await resolveRouteEarliestHour(parsed.data.earliestHour);
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
      earliestDepartureHour: departure.effectiveHour,
    });
    const user = await getCurrentUser();
    recordUsageEvent({
      type: USAGE_TYPES.route,
      userId: user?.id ?? null,
      meta: {
        mode: parsed.data.mode,
        waypoints: route.waypoints?.length ?? 0,
      },
    });
    log.info(
      {
        mode: parsed.data.mode,
        prefer: parsed.data.prefer,
        earliestHour: departure.effectiveHour,
        waypoints: route.waypoints?.length ?? 0,
        alternatives: route.alternatives?.length ?? 0,
      },
      "routes ok",
    );
    return NextResponse.json(route);
  });
}
