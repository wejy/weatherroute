import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { subscriptions } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/session";
import {
  DISCOVER_ANON_DISPLAY,
  DISCOVER_ANON_WEATHER,
  DISCOVER_FREE_DISPLAY,
  DISCOVER_FREE_WEATHER,
  DISCOVER_PRO_DISPLAY_DEFAULT,
  DISCOVER_PRO_DISPLAY_MAX,
  DISCOVER_PRO_WEATHER_BASE,
  weatherCandidateLimit,
} from "@/lib/distance";

export type DiscoverTier = "anon" | "free" | "pro";

export type DiscoverLimits = {
  tier: DiscoverTier;
  display: number;
  weather: number;
};

async function resolveTier(userId: string | null): Promise<DiscoverTier> {
  if (!userId) return "anon";

  const db = getDb();
  if (!db) return "free";

  try {
    const [sub] = await db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    if (sub?.status === "active" || sub?.status === "trial") {
      return "pro";
    }
  } catch {
    // ignore — treat as free
  }
  return "free";
}

/**
 * Resolve discover result caps by auth/subscription tier.
 * Pro display preference (settings) can be wired later; default 30, max 50.
 */
export async function resolveDiscoverLimits(opts?: {
  /** Explicit display override for pro settings (clamped to max). */
  proDisplayPreference?: number;
}): Promise<DiscoverLimits> {
  const user = await getCurrentUser();
  const tier = await resolveTier(user?.id ?? null);

  if (tier === "anon") {
    return {
      tier,
      display: DISCOVER_ANON_DISPLAY,
      weather: DISCOVER_ANON_WEATHER,
    };
  }

  if (tier === "free") {
    return {
      tier,
      display: DISCOVER_FREE_DISPLAY,
      weather: DISCOVER_FREE_WEATHER,
    };
  }

  const pref = opts?.proDisplayPreference;
  const display = Math.min(
    DISCOVER_PRO_DISPLAY_MAX,
    Math.max(
      DISCOVER_FREE_DISPLAY,
      pref ?? DISCOVER_PRO_DISPLAY_DEFAULT,
    ),
  );

  return {
    tier,
    display,
    weather: Math.max(
      DISCOVER_PRO_WEATHER_BASE,
      Math.ceil(display * 1.2),
    ),
  };
}

/** Apply radius scaling on top of tier weather base. */
export function weatherLimitForRadius(
  radiusKm: number,
  tierWeatherBase: number,
): number {
  return weatherCandidateLimit(radiusKm, tierWeatherBase);
}
