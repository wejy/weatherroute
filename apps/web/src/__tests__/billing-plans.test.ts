/**
 * @jest-environment node
 */

import {
  isProBillingStatus,
  maxSavedTripsForPlan,
} from "@/server/billing/plans";
import {
  customerUserBindingOk,
  isCheckoutPaymentSettled,
  mapStripeSubscriptionStatus,
  sessionAmountPlausible,
  sessionMatchesExpectedPrice,
  subscriptionMatchesMonthlyPrice,
} from "@/server/billing/webhook-guards";

describe("billing plans", () => {
  it("treats active/trial/past_due as Pro status", () => {
    expect(isProBillingStatus("active")).toBe(true);
    expect(isProBillingStatus("trial")).toBe(true);
    expect(isProBillingStatus("past_due")).toBe(true);
    expect(isProBillingStatus("free")).toBe(false);
    expect(isProBillingStatus("canceled")).toBe(false);
  });

  it("caps one-time at 2 saved routes", () => {
    expect(maxSavedTripsForPlan("one_time", "active")).toBe(2);
    expect(maxSavedTripsForPlan("monthly", "active")).toBeNull();
    expect(maxSavedTripsForPlan("none", "free")).toBe(0);
  });
});

describe("webhook guards", () => {
  const prevOne = process.env.STRIPE_PRICE_ONE_TIME;
  const prevMonth = process.env.STRIPE_PRICE_MONTHLY;

  beforeAll(() => {
    process.env.STRIPE_PRICE_ONE_TIME = "price_one_time_test";
    process.env.STRIPE_PRICE_MONTHLY = "price_monthly_test";
  });

  afterAll(() => {
    process.env.STRIPE_PRICE_ONE_TIME = prevOne;
    process.env.STRIPE_PRICE_MONTHLY = prevMonth;
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
    expect(subscriptionMatchesMonthlyPrice(["price_monthly_test"])).toBe(true);
    expect(subscriptionMatchesMonthlyPrice(["price_other"])).toBe(false);
  });

  it("checks amount/currency when present", () => {
    expect(sessionAmountPlausible("one_time", 100, "eur")).toBe(true);
    expect(sessionAmountPlausible("one_time", 999, "eur")).toBe(false);
    expect(sessionAmountPlausible("monthly", 280, "eur")).toBe(true);
    expect(sessionAmountPlausible("monthly", 280, "usd")).toBe(false);
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
