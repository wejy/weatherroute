import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { subscriptions } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/session";
import type { DiscoverTier } from "@/server/dal/discover-limits";

export const EARLIEST_DEPARTURE_COOKIE = "wt_earliest_departure";

/** Hours of day (0–23) offered in settings. */
export const EARLIEST_DEPARTURE_HOURS = Array.from(
  { length: 24 },
  (_, h) => h,
) as readonly number[];

export function formatHourOption(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export async function resolveUserTier(
  userId: string | null,
): Promise<DiscoverTier> {
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

export async function readEarliestDeparturePreference(): Promise<number | null> {
  const jar = await cookies();
  const raw = jar.get(EARLIEST_DEPARTURE_COOKIE)?.value;
  if (raw == null || raw === "" || raw === "any") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 23) return null;
  return n;
}

/**
 * Effective earliest departure hour for route suggestions.
 * Pro-only: free/anon always get null (no floor), even if a cookie is stored.
 */
export async function getEffectiveEarliestDepartureHour(): Promise<{
  tier: DiscoverTier;
  /** Stored preference (may exist on free for after upgrade). */
  preference: number | null;
  /** Applied on routes when tier is pro. */
  effectiveHour: number | null;
}> {
  const user = await getCurrentUser();
  const tier = await resolveUserTier(user?.id ?? null);
  const preference = await readEarliestDeparturePreference();
  return {
    tier,
    preference,
    effectiveHour: tier === "pro" ? preference : null,
  };
}
