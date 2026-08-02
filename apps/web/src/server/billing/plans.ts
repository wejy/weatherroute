import "server-only";

/** Paid plan keys stored on `subscriptions.plan`. */
export type BillingPlan = "none" | "one_time" | "monthly";

export type CheckoutPlan = "one_time" | "monthly";

/** One-time Pro access window from `oneTimePaidAt`. */
export const ONE_TIME_VALIDITY_DAYS = 90;

export const BILLING_PLANS = {
  one_time: {
    key: "one_time" as const,
    /** EUR cents */
    amountCents: 100,
    currency: "eur",
    mode: "payment" as const,
    /** Max saved routes; null = unlimited */
    maxSavedTrips: 2,
    validityDays: ONE_TIME_VALIDITY_DAYS,
  },
  monthly: {
    key: "monthly" as const,
    amountCents: 280,
    currency: "eur",
    mode: "subscription" as const,
    maxSavedTrips: null as number | null,
    validityDays: null as number | null,
  },
} as const;

export function isProBillingStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trial" || status === "past_due";
}

export function isPaidPlan(plan: string | null | undefined): plan is CheckoutPlan {
  return plan === "one_time" || plan === "monthly";
}

/** Whether a one-time purchase is still inside its validity window. */
export function isOneTimeWithinValidity(
  paidAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!paidAt) return false;
  const start = paidAt instanceof Date ? paidAt : new Date(paidAt);
  if (Number.isNaN(start.getTime())) return false;
  const expiresAt =
    start.getTime() + ONE_TIME_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() < expiresAt;
}

export function oneTimeExpiresAt(
  paidAt: Date | string | null | undefined,
): Date | null {
  if (!paidAt) return null;
  const start = paidAt instanceof Date ? paidAt : new Date(paidAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(
    start.getTime() + ONE_TIME_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
  );
}

/** Active Pro entitlement including one-time 90-day TTL. */
export function subscriptionGrantsPro(row: {
  status: string | null | undefined;
  plan: string | null | undefined;
  oneTimePaidAt?: Date | string | null;
}): boolean {
  if (!isProBillingStatus(row.status) || !isPaidPlan(row.plan)) return false;
  if (row.plan === "monthly") return true;
  return isOneTimeWithinValidity(row.oneTimePaidAt);
}

/** null = unlimited; 0 = cannot save. */
export function maxSavedTripsForPlan(
  plan: string | null | undefined,
  status: string | null | undefined,
  oneTimePaidAt?: Date | string | null,
): number | null {
  if (!subscriptionGrantsPro({ status, plan, oneTimePaidAt })) return 0;
  if (!isPaidPlan(plan)) return 0;
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
