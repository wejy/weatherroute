import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { subscriptions, trips } from "@/db/schema";
import {
  isPaidPlan,
  isProBillingStatus,
  maxSavedTripsForPlan,
  oneTimeExpiresAt,
  subscriptionGrantsPro,
  type BillingPlan,
  type CheckoutPlan,
} from "@/server/billing/plans";
import type { DiscoverTier } from "@/server/dal/discover-limits";
import { isAdminUser } from "@/server/dal/roles";

export type SubscriptionRow = {
  status: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  oneTimePaidAt: Date | null;
  currentPeriodEnd: Date | null;
};

export type BillingEntitlement = {
  tier: DiscoverTier;
  plan: BillingPlan;
  status: string;
  /** null = unlimited; 0 = cannot save more */
  maxSavedTrips: number | null;
  savedTripCount: number;
  canSaveTrip: boolean;
  stripeCustomerId: string | null;
  hasMonthlySubscription: boolean;
  /** Ever purchased one-time (may be expired). */
  oneTimePurchased: boolean;
  /** One-time Pro still within 90-day window. */
  oneTimeActive: boolean;
  /** Purchase time that starts the 90-day + discover window. */
  oneTimePaidAt: string | null;
  oneTimeExpiresAt: string | null;
};

function emptyEntitlement(tier: DiscoverTier): BillingEntitlement {
  return {
    tier,
    plan: "none",
    status: "free",
    maxSavedTrips: 0,
    savedTripCount: 0,
    canSaveTrip: false,
    stripeCustomerId: null,
    hasMonthlySubscription: false,
    oneTimePurchased: false,
    oneTimeActive: false,
    oneTimePaidAt: null,
    oneTimeExpiresAt: null,
  };
}

export async function getSubscriptionRow(
  userId: string,
): Promise<SubscriptionRow | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const [row] = await db
      .select({
        status: subscriptions.status,
        plan: subscriptions.plan,
        stripeCustomerId: subscriptions.stripeCustomerId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        oneTimePaidAt: subscriptions.oneTimePaidAt,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function countTripsForUser(userId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trips)
    .where(eq(trips.userId, userId));
  return Number(row?.count ?? 0);
}

export async function getBillingEntitlement(
  userId: string | null,
): Promise<BillingEntitlement> {
  if (!userId) return emptyEntitlement("anon");

  const savedTripCount = await countTripsForUser(userId);

  if (await isAdminUser(userId)) {
    return {
      tier: "pro",
      plan: "monthly",
      status: "active",
      maxSavedTrips: null,
      savedTripCount,
      canSaveTrip: true,
      stripeCustomerId: null,
      hasMonthlySubscription: false,
      oneTimePurchased: false,
      oneTimeActive: false,
      oneTimePaidAt: null,
      oneTimeExpiresAt: null,
    };
  }

  const row = await getSubscriptionRow(userId);

  if (!row) {
    return {
      ...emptyEntitlement("free"),
      savedTripCount,
      canSaveTrip: false,
    };
  }

  const plan = (isPaidPlan(row.plan) ? row.plan : "none") as BillingPlan;
  const oneTimeActive =
    plan === "one_time" &&
    isProBillingStatus(row.status) &&
    subscriptionGrantsPro(row);
  const pro = subscriptionGrantsPro(row);
  const effectivePlan: BillingPlan = pro ? plan : "none";
  const maxSaved = maxSavedTripsForPlan(
    row.plan,
    row.status,
    row.oneTimePaidAt,
  );
  const canSaveTrip =
    maxSaved === null ? pro : pro && savedTripCount < maxSaved;
  const expires = oneTimeExpiresAt(row.oneTimePaidAt);

  return {
    tier: pro ? "pro" : "free",
    plan: effectivePlan,
    status: row.status,
    maxSavedTrips: maxSaved,
    savedTripCount,
    canSaveTrip,
    stripeCustomerId: row.stripeCustomerId,
    hasMonthlySubscription:
      Boolean(row.stripeSubscriptionId) && plan === "monthly" && pro,
    oneTimePurchased: Boolean(row.oneTimePaidAt),
    oneTimeActive,
    oneTimePaidAt: row.oneTimePaidAt
      ? row.oneTimePaidAt.toISOString()
      : null,
    oneTimeExpiresAt: expires ? expires.toISOString() : null,
  };
}

export async function upsertSubscription(
  userId: string,
  patch: {
    status: string;
    plan: BillingPlan;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    oneTimePaidAt?: Date | null;
    currentPeriodEnd?: Date | null;
  },
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Database required for billing");

  await db
    .insert(subscriptions)
    .values({
      userId,
      status: patch.status,
      plan: patch.plan,
      stripeCustomerId: patch.stripeCustomerId ?? null,
      stripeSubscriptionId: patch.stripeSubscriptionId ?? null,
      oneTimePaidAt: patch.oneTimePaidAt ?? null,
      currentPeriodEnd: patch.currentPeriodEnd ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        status: patch.status,
        plan: patch.plan,
        ...(patch.stripeCustomerId !== undefined
          ? { stripeCustomerId: patch.stripeCustomerId }
          : {}),
        ...(patch.stripeSubscriptionId !== undefined
          ? { stripeSubscriptionId: patch.stripeSubscriptionId }
          : {}),
        ...(patch.oneTimePaidAt !== undefined
          ? { oneTimePaidAt: patch.oneTimePaidAt }
          : {}),
        ...(patch.currentPeriodEnd !== undefined
          ? { currentPeriodEnd: patch.currentPeriodEnd }
          : {}),
        updatedAt: new Date(),
      },
    });
}

export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  const existing = await getSubscriptionRow(userId);
  if (existing) {
    await db
      .update(subscriptions)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId));
    return;
  }
  await db.insert(subscriptions).values({
    userId,
    status: "free",
    plan: "none",
    stripeCustomerId,
    updatedAt: new Date(),
  });
}

export async function activateCheckoutPlan(opts: {
  userId: string;
  plan: CheckoutPlan;
  stripeCustomerId: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
}): Promise<void> {
  const existing = await getSubscriptionRow(opts.userId);
  // Refresh the 90-day window on every one-time purchase.
  const oneTimePaidAt =
    opts.plan === "one_time"
      ? new Date()
      : existing?.oneTimePaidAt ?? null;

  await upsertSubscription(opts.userId, {
    status: "active",
    plan: opts.plan,
    stripeCustomerId: opts.stripeCustomerId ?? existing?.stripeCustomerId ?? null,
    stripeSubscriptionId:
      opts.plan === "monthly"
        ? (opts.stripeSubscriptionId ?? existing?.stripeSubscriptionId ?? null)
        : null,
    oneTimePaidAt,
    currentPeriodEnd:
      opts.plan === "monthly" ? (opts.currentPeriodEnd ?? null) : null,
  });
}

/** Monthly subscription ended — fall back to one-time Pro if still within 90 days. */
export async function deactivateMonthlySubscription(
  userId: string,
): Promise<void> {
  const existing = await getSubscriptionRow(userId);
  if (!existing) return;

  if (subscriptionGrantsPro({
    status: "active",
    plan: "one_time",
    oneTimePaidAt: existing.oneTimePaidAt,
  })) {
    await upsertSubscription(userId, {
      status: "active",
      plan: "one_time",
      stripeCustomerId: existing.stripeCustomerId,
      stripeSubscriptionId: null,
      oneTimePaidAt: existing.oneTimePaidAt,
      currentPeriodEnd: null,
    });
    return;
  }

  await upsertSubscription(userId, {
    status: "canceled",
    plan: "none",
    stripeCustomerId: existing.stripeCustomerId,
    stripeSubscriptionId: null,
    oneTimePaidAt: existing.oneTimePaidAt,
    currentPeriodEnd: null,
  });
}

export async function findUserIdByStripeCustomerId(
  customerId: string,
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  return row?.userId ?? null;
}
