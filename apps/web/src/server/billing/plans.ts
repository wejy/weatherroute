import "server-only";

/** Paid plan keys stored on `subscriptions.plan`. */
export type BillingPlan = "none" | "one_time" | "monthly" | "yearly";

export type CheckoutPlan = "one_time" | "monthly" | "yearly";

/** Finnish VAT rate included in list prices (display + Stripe gross). */
export const VAT_RATE_FI = 0.255;

/** One-time Pro access window from `oneTimePaidAt` (UTC days). */
export const ONE_TIME_VALIDITY_DAYS = 60;

export const BILLING_PLANS = {
  one_time: {
    key: "one_time" as const,
    /** EUR cents, VAT-inclusive */
    amountCents: 199,
    currency: "eur",
    mode: "payment" as const,
    /** Max saved routes; null = unlimited */
    maxSavedTrips: 2,
    validityDays: ONE_TIME_VALIDITY_DAYS,
  },
  monthly: {
    key: "monthly" as const,
    amountCents: 299,
    currency: "eur",
    mode: "subscription" as const,
    maxSavedTrips: null as number | null,
    validityDays: null as number | null,
    interval: "month" as const,
  },
  yearly: {
    key: "yearly" as const,
    amountCents: 3000,
    currency: "eur",
    mode: "subscription" as const,
    maxSavedTrips: null as number | null,
    validityDays: null as number | null,
    interval: "year" as const,
  },
} as const;

export function isProBillingStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trial" || status === "past_due";
}

export function isPaidPlan(plan: string | null | undefined): plan is CheckoutPlan {
  return plan === "one_time" || plan === "monthly" || plan === "yearly";
}

export function isRecurringPlan(
  plan: string | null | undefined,
): plan is "monthly" | "yearly" {
  return plan === "monthly" || plan === "yearly";
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

/** Active Pro entitlement including one-time TTL. */
export function subscriptionGrantsPro(row: {
  status: string | null | undefined;
  plan: string | null | undefined;
  oneTimePaidAt?: Date | string | null;
}): boolean {
  if (!isProBillingStatus(row.status) || !isPaidPlan(row.plan)) return false;
  if (isRecurringPlan(row.plan)) return true;
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
  if (plan === "yearly") {
    return process.env.STRIPE_PRICE_YEARLY?.trim() || null;
  }
  return process.env.STRIPE_PRICE_MONTHLY?.trim() || null;
}

export function isStripeBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ONE_TIME?.trim() &&
      process.env.STRIPE_PRICE_MONTHLY?.trim() &&
      process.env.STRIPE_PRICE_YEARLY?.trim(),
  );
}

/** First Pro date is sticky — never overwrite an existing value. */
export function resolveProSince(opts: {
  existingProSince: Date | null;
  plan: CheckoutPlan;
  oneTimePaidAt: Date | null;
  now?: Date;
}): Date {
  if (opts.existingProSince) return opts.existingProSince;
  if (opts.plan === "one_time" && opts.oneTimePaidAt) return opts.oneTimePaidAt;
  return opts.now ?? new Date();
}

/** Infer CheckoutPlan from a Stripe subscription's price ids. */
export function recurringPlanFromPriceIds(
  priceIds: string[],
): "monthly" | "yearly" | null {
  const yearly = stripePriceIdForPlan("yearly");
  const monthly = stripePriceIdForPlan("monthly");
  if (yearly && priceIds.includes(yearly)) return "yearly";
  if (monthly && priceIds.includes(monthly)) return "monthly";
  return null;
}
