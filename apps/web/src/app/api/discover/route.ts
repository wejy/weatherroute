import { NextRequest, NextResponse } from "next/server";
import { discoverQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { discoverDestinations } from "@/server/services/weather-service";
import { getLocale } from "@/i18n/get-dictionary";
import {
  gateDiscoverAccess,
  isActiveDiscoverQuery,
} from "@/server/dal/discover-gate";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`discover:${ip}`, 30);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
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
    meta: {
      origin: parsed.data.origin,
      weatherGoal: parsed.data.weatherGoal,
      path: "/api/discover",
    },
  });

  if (gate.paywalled) {
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
  const headers: Record<string, string> = {};
  if (gate.quota) {
    headers["X-Quota-Remaining"] = String(gate.quota.remaining);
    headers["X-Quota-Limit"] = String(gate.quota.limit);
  }
  return NextResponse.json(result, { headers });
}
