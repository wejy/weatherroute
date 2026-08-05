import "server-only";

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
import { subscriptionGrantsPro } from "@/server/billing/plans";

const log = createModuleLogger("billing.sync");

export { periodEndFromSubscription };

/**
 * Repair DB when Stripe has an active monthly Pro sub but local row is free
 * (missed webhook / stripe listen down). Returns true if local row changed.
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
    const listed = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });

    const match = listed.data.find((sub) => {
      if (!subscriptionMatchesMonthlyPrice(subscriptionPriceIds(sub))) {
        return false;
      }
      return mapStripeSubscriptionStatus(sub.status).action === "activate";
    });

    if (match) {
      const already =
        existing.plan === "monthly" &&
        subscriptionGrantsPro(existing) &&
        existing.stripeSubscriptionId === match.id;
      if (already) return false;

      await activateCheckoutPlan({
        userId,
        plan: "monthly",
        stripeCustomerId: customerId,
        stripeSubscriptionId: match.id,
        currentPeriodEnd: periodEndFromSubscription(match),
      });
      log.info(
        { userId, subId: match.id, status: match.status },
        "reconciled monthly Pro from Stripe",
      );
      return true;
    }

    if (existing.plan === "monthly" && subscriptionGrantsPro(existing)) {
      await deactivateMonthlySubscription(userId);
      log.info({ userId }, "reconciled: no active Stripe monthly → deactivated");
      return true;
    }

    return false;
  } catch (err) {
    log.warn({ err, userId }, "reconcileSubscriptionFromStripe failed");
    return false;
  }
}
