import "server-only";

import type Stripe from "stripe";
import {
  BILLING_PLANS,
  stripePriceIdForPlan,
  type CheckoutPlan,
} from "@/server/billing/plans";

export type SubscriptionStatusAction =
  | { action: "activate"; status: "active" | "trial" | "past_due" }
  | { action: "deactivate" }
  | { action: "ignore" };

/**
 * Map Stripe subscription.status → app action.
 * `incomplete` must never grant Pro (unpaid first invoice / abandoned SCA).
 * `unpaid` revokes Monthly (fall back handled by deactivate).
 * `past_due` keeps Pro briefly (grace after a successful period).
 */
export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status | string,
): SubscriptionStatusAction {
  switch (status) {
    case "active":
      return { action: "activate", status: "active" };
    case "trialing":
      return { action: "activate", status: "trial" };
    case "past_due":
      return { action: "activate", status: "past_due" };
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return { action: "deactivate" };
    case "incomplete":
    default:
      return { action: "ignore" };
  }
}

export function isCheckoutPaymentSettled(
  paymentStatus: string | null | undefined,
): boolean {
  return (
    paymentStatus === "paid" || paymentStatus === "no_payment_required"
  );
}

export function subscriptionPriceIds(sub: Stripe.Subscription): string[] {
  return (sub.items?.data ?? []).map((item) => {
    const price = item.price;
    return typeof price === "string" ? price : price.id;
  });
}

export function sessionLinePriceIds(
  session: Stripe.Checkout.Session,
): string[] {
  const data = session.line_items?.data;
  if (!data?.length) return [];
  return data.map((item) => {
    const price = item.price;
    if (!price) return "";
    return typeof price === "string" ? price : price.id;
  }).filter(Boolean);
}

export function expectedPriceIdForPlan(plan: CheckoutPlan): string | null {
  return stripePriceIdForPlan(plan);
}

export function sessionMatchesExpectedPrice(
  plan: CheckoutPlan,
  priceIds: string[],
): boolean {
  const expected = expectedPriceIdForPlan(plan);
  if (!expected) return false;
  return priceIds.includes(expected);
}

export function subscriptionMatchesMonthlyPrice(
  priceIds: string[],
): boolean {
  const expected = stripePriceIdForPlan("monthly");
  if (!expected) return false;
  return priceIds.includes(expected);
}

/** Soft amount check when Stripe reports amount_total (cents). */
export function sessionAmountPlausible(
  plan: CheckoutPlan,
  amountTotal: number | null | undefined,
  currency: string | null | undefined,
): boolean {
  if (amountTotal == null) return true;
  const expected = BILLING_PLANS[plan];
  if (currency && currency.toLowerCase() !== expected.currency) return false;
  return amountTotal === expected.amountCents;
}

/**
 * Reject if this Stripe customer is already bound to a different user,
 * or if the user already has a different customer id.
 */
export function customerUserBindingOk(opts: {
  sessionCustomerId: string | null;
  metadataUserId: string;
  existingUserCustomerId: string | null;
  customerOwnerUserId: string | null;
}): boolean {
  const {
    sessionCustomerId,
    metadataUserId,
    existingUserCustomerId,
    customerOwnerUserId,
  } = opts;

  if (
    existingUserCustomerId &&
    sessionCustomerId &&
    existingUserCustomerId !== sessionCustomerId
  ) {
    return false;
  }
  if (customerOwnerUserId && customerOwnerUserId !== metadataUserId) {
    return false;
  }
  return true;
}
