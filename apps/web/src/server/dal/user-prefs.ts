import "server-only";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/server/auth/session";
import {
  getBillingEntitlement,
  getSubscriptionRow,
} from "@/server/dal/subscriptions";
import { subscriptionGrantsPro } from "@/server/billing/plans";
import type { DiscoverTier } from "@/server/dal/discover-limits";
import { isAdminUser } from "@/server/dal/roles";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { parseEarliestHourParam } from "@/lib/departure";

export { EARLIEST_DEPARTURE_HOURS, formatHourOption, parseEarliestHourParam } from "@/lib/departure";

export const SAME_COUNTRY_COOKIE = "wt_same_country_only";

export async function resolveUserTier(
  userId: string | null,
): Promise<DiscoverTier> {
  if (!userId) return "anon";

  if (await isAdminUser(userId)) {
    return "pro";
  }

  const row = await getSubscriptionRow(userId);
  if (row && subscriptionGrantsPro(row)) {
    return "pro";
  }
  return "free";
}

/**
 * Per-route earliest departure from query/body.
 * Applied only for Pro; free/anon ignore the requested hour.
 */
export async function resolveRouteEarliestHour(
  requested: number | null | undefined,
): Promise<{
  tier: DiscoverTier;
  effectiveHour: number | null;
}> {
  const user = await getCurrentUser();
  const tier = await resolveUserTier(user?.id ?? null);
  const hour = parseEarliestHourParam(requested ?? null);
  return {
    tier,
    effectiveHour: tier === "pro" ? hour : null,
  };
}

async function readSameCountryOnlyFromCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(SAME_COUNTRY_COOKIE)?.value === "1";
}

export async function readSameCountryOnlyPreference(
  userId?: string | null,
): Promise<boolean> {
  const id = userId ?? (await getCurrentUser())?.id ?? null;
  if (id) {
    const db = getDb();
    if (db) {
      const [row] = await db
        .select({ sameCountryOnly: users.sameCountryOnly })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (row) return Boolean(row.sameCountryOnly);
    }
  }
  return readSameCountryOnlyFromCookie();
}

export async function writeSameCountryOnlyPreference(
  userId: string,
  enabled: boolean,
): Promise<void> {
  const db = getDb();
  if (db) {
    await db
      .update(users)
      .set({ sameCountryOnly: enabled })
      .where(eq(users.id, userId));
  }

  const jar = await cookies();
  jar.set(SAME_COUNTRY_COOKIE, enabled ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Effective same-country discover filter.
 * Pro-only: free/anon never filter by country, even if preference is stored.
 */
export async function getEffectiveSameCountryOnly(): Promise<{
  tier: DiscoverTier;
  preference: boolean;
  effective: boolean;
}> {
  const user = await getCurrentUser();
  const tier = await resolveUserTier(user?.id ?? null);
  const preference = await readSameCountryOnlyPreference(user?.id ?? null);
  return {
    tier,
    preference,
    effective: tier === "pro" && preference,
  };
}

export async function getCurrentBillingEntitlement() {
  const user = await getCurrentUser();
  return getBillingEntitlement(user?.id ?? null);
}
