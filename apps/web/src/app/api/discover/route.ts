import { NextRequest, NextResponse } from "next/server";
import { discoverQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { discoverDestinations } from "@/server/services/weather-service";
import { getLocale } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/server/auth/session";
import {
  consumeDiscoverQuota,
  loggedInHasUnlimitedDiscover,
} from "@/server/dal/quota";

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

  const user = await getCurrentUser();
  let quotaHeaders: Record<string, string> = {};

  if (!user || !loggedInHasUnlimitedDiscover()) {
    const consumed = await consumeDiscoverQuota({
      origin: parsed.data.origin,
      weatherGoal: parsed.data.weatherGoal,
    });
    if (!consumed.ok && consumed.reason === "paywall") {
      return NextResponse.json(
        {
          error: "PAYWALL",
          message: "Anonymous discover limit reached. Sign in to continue.",
          quota: consumed.quota,
        },
        { status: 402 },
      );
    }
    if (consumed.quota) {
      quotaHeaders = {
        "X-Quota-Remaining": String(consumed.quota.remaining),
        "X-Quota-Limit": String(consumed.quota.limit),
      };
    }
  }

  const locale =
    parsed.data.lang ?? ((await getLocale()) === "fi" ? "fi" : "en");
  const result = await discoverDestinations(parsed.data, locale);
  return NextResponse.json(result, { headers: quotaHeaders });
}
