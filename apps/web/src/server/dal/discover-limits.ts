import "server-only";

import { cookies } from "next/headers";
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
import { resolveUserTier } from "@/server/dal/user-prefs";

export type DiscoverTier = "anon" | "free" | "pro";

export type DiscoverLimits = {
  tier: DiscoverTier;
  display: number;
  weather: number;
};

export const DISCOVER_DISPLAY_COOKIE = "wt_discover_display";

export const DISCOVER_DISPLAY_OPTIONS = [10, 20, 30] as const;

async function resolveTier(userId: string | null): Promise<DiscoverTier> {
  return resolveUserTier(userId);
}

export async function readDiscoverDisplayPreference(): Promise<number | null> {
  const jar = await cookies();
  const raw = jar.get(DISCOVER_DISPLAY_COOKIE)?.value;
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(DISCOVER_PRO_DISPLAY_MAX, Math.max(10, Math.round(n)));
}

/**
 * Resolve discover result caps by auth/subscription tier.
 * Pro (and stored preference) can raise display up to DISCOVER_PRO_DISPLAY_MAX (30).
 */
export async function resolveDiscoverLimits(opts?: {
  proDisplayPreference?: number;
}): Promise<DiscoverLimits> {
  const user = await getCurrentUser();
  const tier = await resolveTier(user?.id ?? null);
  const stored =
    opts?.proDisplayPreference ?? (await readDiscoverDisplayPreference());

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

  const display = Math.min(
    DISCOVER_PRO_DISPLAY_MAX,
    Math.max(
      DISCOVER_FREE_DISPLAY,
      stored ?? DISCOVER_PRO_DISPLAY_DEFAULT,
    ),
  );

  return {
    tier,
    display,
    weather: Math.max(DISCOVER_PRO_WEATHER_BASE, Math.ceil(display * 1.2)),
  };
}

/** Apply radius scaling on top of tier weather base. */
export function weatherLimitForRadius(
  radiusKm: number,
  tierWeatherBase: number,
): number {
  return weatherCandidateLimit(radiusKm, tierWeatherBase);
}

export async function getDiscoverTierForSettings(): Promise<{
  tier: DiscoverTier;
  currentDisplay: number;
  preference: number | null;
  maxSelectable: number;
}> {
  const user = await getCurrentUser();
  const tier = await resolveTier(user?.id ?? null);
  const preference = await readDiscoverDisplayPreference();
  const limits = await resolveDiscoverLimits({
    proDisplayPreference: preference ?? undefined,
  });

  return {
    tier,
    currentDisplay: limits.display,
    preference,
    maxSelectable:
      tier === "pro"
        ? DISCOVER_PRO_DISPLAY_MAX
        : tier === "free"
          ? DISCOVER_FREE_DISPLAY
          : DISCOVER_ANON_DISPLAY,
  };
}
