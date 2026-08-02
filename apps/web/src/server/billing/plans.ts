import "server-only";

/** Paid plan keys stored on `subscriptions.plan`. */
export type BillingPlan = "none" | "one_time" | "monthly";

export type CheckoutPlan = "one_time" | "monthly";

export const BILLING_PLANS = {
  one_time: {
    key: "one_time" as const,
    /** EUR cents */
    amountCents: 100,
    currency: "eur",
    mode: "payment" as const,
    /** Max saved routes; null = unlimited */
    maxSavedTrips: 2,
  },
  monthly: {
    key: "monthly" as const,
    amountCents: 280,
    currency: "eur",
    mode: "subscription" as const,
    maxSavedTrips: null as number | null,
  },
} as const;

export function isProBillingStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trial" || status === "past_due";
}

export function isPaidPlan(plan: string | null | undefined): plan is CheckoutPlan {
  return plan === "one_time" || plan === "monthly";
}

/** null = unlimited; 0 = cannot save. */
export function maxSavedTripsForPlan(
  plan: string | null | undefined,
  status: string | null | undefined,
): number | null {
  if (!isProBillingStatus(status) || !isPaidPlan(plan)) return 0;
  return BILLING_PLANS[plan].maxSavedTrips;
}

export function stripePriceIdForPlan(plan: CheckoutPlan): string | null {
  if (plan === "one_time") {
    return process.env.STRIPE_PRICE_ONE_TIME?.trim() || null;
  }
  return process.env.STRIPE_PRICE_MONTHLY?.trim() || null;
}

export function isStripeBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ONE_TIME?.trim() &&
      process.env.STRIPE_PRICE_MONTHLY?.trim(),
  );
}
