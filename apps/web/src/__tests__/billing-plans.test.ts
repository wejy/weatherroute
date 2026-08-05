/**
 * @jest-environment node
 */

import {
  BILLING_PLANS,
  isOneTimeWithinValidity,
  isProBillingStatus,
  maxSavedTripsForPlan,
  ONE_TIME_VALIDITY_DAYS,
  resolveProSince,
  subscriptionGrantsPro,
} from "@/server/billing/plans";
import {
  customerUserBindingOk,
  isCheckoutPaymentSettled,
  mapStripeSubscriptionStatus,
  periodEndFromSubscription,
  sessionAmountPlausible,
  sessionMatchesExpectedPrice,
  subscriptionMatchesMonthlyPrice,
} from "@/server/billing/webhook-guards";

describe("billing plans", () => {
  it("exposes VAT-inclusive list amounts", () => {
    expect(BILLING_PLANS.one_time.amountCents).toBe(199);
    expect(BILLING_PLANS.monthly.amountCents).toBe(299);
    expect(BILLING_PLANS.yearly.amountCents).toBe(3000);
    expect(ONE_TIME_VALIDITY_DAYS).toBe(60);
  });

  it("treats active/trial/past_due as Pro status", () => {
    expect(isProBillingStatus("active")).toBe(true);
    expect(isProBillingStatus("trial")).toBe(true);
    expect(isProBillingStatus("past_due")).toBe(true);
    expect(isProBillingStatus("free")).toBe(false);
    expect(isProBillingStatus("canceled")).toBe(false);
  });

  it("caps one-time at 2 saved routes while valid", () => {
    const recent = new Date();
    expect(maxSavedTripsForPlan("one_time", "active", recent)).toBe(2);
    expect(maxSavedTripsForPlan("monthly", "active")).toBeNull();
    expect(maxSavedTripsForPlan("yearly", "active")).toBeNull();
    expect(maxSavedTripsForPlan("none", "free")).toBe(0);
  });

  it(`expires one-time Pro after ${ONE_TIME_VALIDITY_DAYS} days`, () => {
    const now = new Date("2026-08-02T12:00:00.000Z");
    const fresh = new Date("2026-07-01T12:00:00.000Z");
    const expired = new Date("2026-04-01T12:00:00.000Z");

    expect(isOneTimeWithinValidity(fresh, now)).toBe(true);
    expect(isOneTimeWithinValidity(expired, now)).toBe(false);

    expect(
      subscriptionGrantsPro({
        status: "active",
        plan: "one_time",
        oneTimePaidAt: fresh,
      }),
    ).toBe(true);
    expect(
      subscriptionGrantsPro({
        status: "active",
        plan: "one_time",
        oneTimePaidAt: expired,
      }),
    ).toBe(false);
    expect(
      subscriptionGrantsPro({
        status: "active",
        plan: "monthly",
        oneTimePaidAt: null,
      }),
    ).toBe(true);
    expect(
      subscriptionGrantsPro({
        status: "active",
        plan: "yearly",
        oneTimePaidAt: null,
      }),
    ).toBe(true);

    expect(maxSavedTripsForPlan("one_time", "active", expired)).toBe(0);
  });
});

describe("proSince sticky activation", () => {
  it("sets proSince from oneTimePaidAt on first one-time activation", () => {
    const paidAt = new Date("2026-06-01T10:00:00.000Z");
    expect(
      resolveProSince({
        existingProSince: null,
        plan: "one_time",
        oneTimePaidAt: paidAt,
      }).toISOString(),
    ).toBe(paidAt.toISOString());
  });

  it("sets proSince to now on first monthly activation", () => {
    const now = new Date("2026-07-15T08:00:00.000Z");
    expect(
      resolveProSince({
        existingProSince: null,
        plan: "monthly",
        oneTimePaidAt: null,
        now,
      }).toISOString(),
    ).toBe(now.toISOString());
  });

  it("does not overwrite an existing proSince", () => {
    const existing = new Date("2026-01-01T00:00:00.000Z");
    const paidAt = new Date("2026-08-01T00:00:00.000Z");
    expect(
      resolveProSince({
        existingProSince: existing,
        plan: "one_time",
        oneTimePaidAt: paidAt,
      }).toISOString(),
    ).toBe(existing.toISOString());
    expect(
      resolveProSince({
        existingProSince: existing,
        plan: "monthly",
        oneTimePaidAt: null,
        now: paidAt,
      }).toISOString(),
    ).toBe(existing.toISOString());
  });
});

describe("periodEndFromSubscription (Stripe API shape)", () => {
  it("reads current_period_end from subscription items", () => {
    const end = periodEndFromSubscription({
      items: { data: [{ current_period_end: 1_788_621_166 }] },
    } as unknown as Parameters<typeof periodEndFromSubscription>[0]);
    expect(end?.toISOString()).toBe("2026-09-05T15:12:46.000Z");
  });

  it("falls back to legacy subscription.current_period_end", () => {
    const end = periodEndFromSubscription({
      current_period_end: 1_700_000_000,
      items: { data: [] },
    } as unknown as Parameters<typeof periodEndFromSubscription>[0]);
    expect(end?.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });
});

describe("webhook guards", () => {
  const prevOne = process.env.STRIPE_PRICE_ONE_TIME;
  const prevMonth = process.env.STRIPE_PRICE_MONTHLY;
  const prevYear = process.env.STRIPE_PRICE_YEARLY;

  beforeAll(() => {
    process.env.STRIPE_PRICE_ONE_TIME = "price_one_time_test";
    process.env.STRIPE_PRICE_MONTHLY = "price_monthly_test";
    process.env.STRIPE_PRICE_YEARLY = "price_yearly_test";
  });

  afterAll(() => {
    process.env.STRIPE_PRICE_ONE_TIME = prevOne;
    process.env.STRIPE_PRICE_MONTHLY = prevMonth;
    process.env.STRIPE_PRICE_YEARLY = prevYear;
  });

  it("requires settled payment before granting Pro", () => {
    expect(isCheckoutPaymentSettled("paid")).toBe(true);
    expect(isCheckoutPaymentSettled("no_payment_required")).toBe(true);
    expect(isCheckoutPaymentSettled("unpaid")).toBe(false);
    expect(isCheckoutPaymentSettled(null)).toBe(false);
  });

  it("does not activate Pro for incomplete subscriptions", () => {
    expect(mapStripeSubscriptionStatus("incomplete")).toEqual({
      action: "ignore",
    });
    expect(mapStripeSubscriptionStatus("unpaid")).toEqual({
      action: "deactivate",
    });
    expect(mapStripeSubscriptionStatus("active")).toEqual({
      action: "activate",
      status: "active",
    });
    expect(mapStripeSubscriptionStatus("past_due")).toEqual({
      action: "activate",
      status: "past_due",
    });
  });

  it("requires configured price ids on checkout / subscription", () => {
    expect(
      sessionMatchesExpectedPrice("one_time", ["price_one_time_test"]),
    ).toBe(true);
    expect(sessionMatchesExpectedPrice("one_time", ["price_other"])).toBe(
      false,
    );
    expect(sessionMatchesExpectedPrice("yearly", ["price_yearly_test"])).toBe(
      true,
    );
    expect(subscriptionMatchesMonthlyPrice(["price_monthly_test"])).toBe(true);
    expect(subscriptionMatchesMonthlyPrice(["price_yearly_test"])).toBe(true);
    expect(subscriptionMatchesMonthlyPrice(["price_other"])).toBe(false);
  });

  it("checks amount/currency when present", () => {
    expect(sessionAmountPlausible("one_time", 199, "eur")).toBe(true);
    expect(sessionAmountPlausible("one_time", 100, "eur")).toBe(false);
    expect(sessionAmountPlausible("monthly", 299, "eur")).toBe(true);
    expect(sessionAmountPlausible("monthly", 299, "usd")).toBe(false);
    expect(sessionAmountPlausible("yearly", 3000, "eur")).toBe(true);
    expect(sessionAmountPlausible("one_time", null, null)).toBe(true);
  });

  it("rejects customer/user binding mismatches", () => {
    expect(
      customerUserBindingOk({
        sessionCustomerId: "cus_a",
        metadataUserId: "user_1",
        existingUserCustomerId: "cus_a",
        customerOwnerUserId: "user_1",
      }),
    ).toBe(true);

    expect(
      customerUserBindingOk({
        sessionCustomerId: "cus_b",
        metadataUserId: "user_1",
        existingUserCustomerId: "cus_a",
        customerOwnerUserId: null,
      }),
    ).toBe(false);

    expect(
      customerUserBindingOk({
        sessionCustomerId: "cus_a",
        metadataUserId: "user_1",
        existingUserCustomerId: null,
        customerOwnerUserId: "user_2",
      }),
    ).toBe(false);
  });
});
