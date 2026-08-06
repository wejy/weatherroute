import "server-only";

import type Stripe from "stripe";
import { createModuleLogger } from "@/lib/logger";
import {
  mapStripeSubscriptionStatus,
  periodEndFromSubscription,
  subscriptionMatchesMonthlyPrice,
  subscriptionPriceIds,
} from "@/server/billing/webhook-guards";
import { getStripe } from "@/server/billing/stripe";
import {
  activateCheckoutPlan,
  deactivateMonthlySubscription,
  getSubscriptionRow,
} from "@/server/dal/subscriptions";
import {
  isRecurringPlan,
  recurringPlanFromPriceIds,
  subscriptionGrantsPro,
} from "@/server/billing/plans";

const log = createModuleLogger("billing.sync");

export { periodEndFromSubscription };

function stripeCancelAtPeriodEnd(sub: Stripe.Subscription): boolean {
  return Boolean(
    sub.cancel_at_period_end ||
      (typeof sub.cancel_at === "number" && sub.cancel_at > 0),
  );
}

function planFromSubscription(
  sub: Stripe.Subscription,
  fallback: "monthly" | "yearly" = "monthly",
): "monthly" | "yearly" {
  return (
    recurringPlanFromPriceIds(subscriptionPriceIds(sub)) ??
    (sub.metadata?.plan === "yearly" ? "yearly" : fallback)
  );
}

/**
 * Prefer configured Pro price IDs. If env prices were regenerated (stripe-setup)
 * after checkout, fall back to the tracked sub or a single active subscription
 * so we never treat a live Stripe sub as "gone" and wipe Pro / cancel flags.
 */
function pickActiveRecurringSubscription(
  subs: Stripe.Subscription[],
  preferredSubId?: string | null,
): { sub: Stripe.Subscription; priceMatched: boolean } | null {
  const active = subs.filter(
    (sub) => mapStripeSubscriptionStatus(sub.status).action === "activate",
  );
  if (active.length === 0) return null;

  const priced = active.find((sub) =>
    subscriptionMatchesMonthlyPrice(subscriptionPriceIds(sub)),
  );
  if (priced) return { sub: priced, priceMatched: true };

  if (preferredSubId) {
    const preferred = active.find((sub) => sub.id === preferredSubId);
    if (preferred) return { sub: preferred, priceMatched: false };
  }

  if (active.length === 1) return { sub: active[0], priceMatched: false };
  return null;
}

async function applyActiveRecurringSync(opts: {
  userId: string;
  customerId: string;
  sub: Stripe.Subscription;
  existing: NonNullable<Awaited<ReturnType<typeof getSubscriptionRow>>>;
  priceMatched: boolean;
  source: string;
}): Promise<boolean> {
  const { userId, customerId, sub, existing, priceMatched, source } = opts;
  const plan = planFromSubscription(
    sub,
    existing.plan === "yearly" ? "yearly" : "monthly",
  );
  const cancelAtPeriodEnd = stripeCancelAtPeriodEnd(sub);
  const periodEnd = periodEndFromSubscription(sub);
  const already =
    isRecurringPlan(existing.plan) &&
    existing.plan === plan &&
    subscriptionGrantsPro(existing) &&
    existing.stripeSubscriptionId === sub.id &&
    Boolean(existing.cancelAtPeriodEnd) === cancelAtPeriodEnd &&
    (existing.currentPeriodEnd?.getTime() ?? null) ===
      (periodEnd?.getTime() ?? null);
  if (already) return false;

  if (!priceMatched) {
    log.warn(
      {
        userId,
        subId: sub.id,
        prices: subscriptionPriceIds(sub),
        source,
      },
      "Stripe subscription price ≠ configured STRIPE_PRICE_* — syncing anyway (likely re-ran stripe-setup)",
    );
  }

  await activateCheckoutPlan({
    userId,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd,
  });
  log.info(
    {
      userId,
      subId: sub.id,
      status: sub.status,
      plan,
      cancelAtPeriodEnd,
      priceMatched,
      source,
    },
    "reconciled recurring Pro from Stripe",
  );
  return true;
}

/**
 * Repair DB when Stripe has an active Pro subscription but local row is free
 * (missed webhook / stripe listen down). Also syncs cancel_at_period_end while
 * Pro is still active. Returns true if local row changed.
 */
export async function reconcileSubscriptionFromStripe(
  userId: string,
): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return false;

  const existing = await getSubscriptionRow(userId);
  const customerId = existing?.stripeCustomerId;
  if (!customerId) return false;

  try {
    const stripe = getStripe();

    // Fast path: known subscription id (covers portal cancel while still active).
    // Do not require local Pro — recovers after a false deactivate from price drift.
    if (existing.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(
          existing.stripeSubscriptionId,
        );
        const mapped = mapStripeSubscriptionStatus(sub.status);
        if (mapped.action === "deactivate") {
          if (subscriptionGrantsPro(existing) && isRecurringPlan(existing.plan)) {
            await deactivateMonthlySubscription(userId);
            log.info(
              { userId, subId: sub.id, status: sub.status },
              "reconciled: tracked sub no longer active → deactivated",
            );
            return true;
          }
        } else if (mapped.action === "activate") {
          return applyActiveRecurringSync({
            userId,
            customerId,
            sub,
            existing,
            priceMatched: subscriptionMatchesMonthlyPrice(
              subscriptionPriceIds(sub),
            ),
            source: "retrieve",
          });
        }
      } catch (err) {
        log.warn(
          { err, userId, subId: existing.stripeSubscriptionId },
          "retrieve tracked subscription failed; falling back to list",
        );
      }
    }

    const listed = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });

    const picked = pickActiveRecurringSubscription(
      listed.data,
      existing.stripeSubscriptionId,
    );

    if (picked) {
      return applyActiveRecurringSync({
        userId,
        customerId,
        sub: picked.sub,
        existing,
        priceMatched: picked.priceMatched,
        source: "list",
      });
    }

    // Only revoke when Stripe has no activate-worthy sub at all (ignore price match).
    const anyActive = listed.data.some(
      (sub) => mapStripeSubscriptionStatus(sub.status).action === "activate",
    );
    if (
      !anyActive &&
      isRecurringPlan(existing.plan) &&
      subscriptionGrantsPro(existing)
    ) {
      await deactivateMonthlySubscription(userId);
      log.info(
        { userId },
        "reconciled: no active Stripe recurring → deactivated",
      );
      return true;
    }

    if (anyActive) {
      log.warn(
        { userId, count: listed.data.length },
        "multiple active Stripe subscriptions without configured price match — leaving local row unchanged",
      );
    }

    return false;
  } catch (err) {
    log.warn({ err, userId }, "reconcileSubscriptionFromStripe failed");
    return false;
  }
}
