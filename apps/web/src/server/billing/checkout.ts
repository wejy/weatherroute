import "server-only";

import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { createModuleLogger } from "@/lib/logger";
import {
  isStripeBillingConfigured,
  recurringPlanFromPriceIds,
  stripePriceIdForPlan,
  type CheckoutPlan,
} from "@/server/billing/plans";
import { getStripe } from "@/server/billing/stripe";
import {
  customerUserBindingOk,
  isCheckoutPaymentSettled,
  mapStripeSubscriptionStatus,
  periodEndFromSubscription,
  sessionAmountPlausible,
  sessionLinePriceIds,
  sessionMatchesExpectedPrice,
  subscriptionMatchesMonthlyPrice,
  subscriptionPriceIds,
} from "@/server/billing/webhook-guards";
import {
  activateCheckoutPlan,
  deactivateMonthlySubscription,
  findUserIdByStripeCustomerId,
  getSubscriptionRow,
  setStripeCustomerId,
  upsertSubscription,
} from "@/server/dal/subscriptions";

const log = createModuleLogger("billing.checkout");

async function userEmail(userId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.email ?? null;
}

export async function ensureStripeCustomer(opts: {
  userId: string;
  email: string;
}): Promise<string> {
  const existing = await getSubscriptionRow(opts.userId);
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: opts.email,
    metadata: { userId: opts.userId },
  });
  await setStripeCustomerId(opts.userId, customer.id);
  return customer.id;
}

export async function createCheckoutSession(opts: {
  userId: string;
  email: string;
  plan: CheckoutPlan;
  /** When true, Stripe returns via /open-app → solviax:// deep link. */
  returnToApp?: boolean;
}): Promise<{ url: string }> {
  if (!isStripeBillingConfigured()) {
    throw new Error("Stripe billing is not configured");
  }
  const priceId = stripePriceIdForPlan(opts.plan);
  if (!priceId) throw new Error(`Missing Stripe price for ${opts.plan}`);

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer({
    userId: opts.userId,
    email: opts.email,
  });

  const base = env.appUrl.replace(/\/$/, "");
  const mode =
    opts.plan === "monthly" || opts.plan === "yearly"
      ? "subscription"
      : "payment";

  const successWeb = `${base}/pro?checkout=success&plan=${opts.plan}`;
  const cancelWeb = `${base}/pro?checkout=cancel`;
  const successUrl = opts.returnToApp
    ? `${base}/open-app?to=${encodeURIComponent(`solviax://pro?checkout=success&plan=${opts.plan}`)}`
    : successWeb;
  const cancelUrl = opts.returnToApp
    ? `${base}/open-app?to=${encodeURIComponent("solviax://pro?checkout=cancel")}`
    : cancelWeb;

  const session = await stripe.checkout.sessions.create({
    mode,
    customer: customerId,
    client_reference_id: opts.userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: opts.userId,
      plan: opts.plan,
    },
    ...(mode === "subscription"
      ? {
          subscription_data: {
            metadata: { userId: opts.userId, plan: opts.plan },
          },
        }
      : {
          payment_intent_data: {
            metadata: { userId: opts.userId, plan: "one_time" },
          },
          // So one-time purchases appear in invoices.list / payment history UI.
          invoice_creation: { enabled: true },
        }),
    // New accounts enable Managed Payments by default (requires product tax codes).
    // SDK types may lag; classic Checkout is correct for fixed EUR Pro plans.
    ...({
      managed_payments: { enabled: false },
    } as Stripe.Checkout.SessionCreateParams),
  });

  if (!session.url) throw new Error("Stripe Checkout did not return a URL");
  return { url: session.url };
}

export async function createBillingPortalSession(opts: {
  userId: string;
  email: string;
  returnToApp?: boolean;
}): Promise<{ url: string }> {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    throw new Error("Stripe is not configured");
  }
  const existing = await getSubscriptionRow(opts.userId);
  const customerId = existing?.stripeCustomerId;
  if (!customerId) {
    throw new Error("No Stripe customer — purchase or subscribe first");
  }
  const stripe = getStripe();
  const base = env.appUrl.replace(/\/$/, "");
  const returnUrl = opts.returnToApp
    ? `${base}/open-app?to=${encodeURIComponent("solviax://pro")}`
    : `${base}/pro`;
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: portal.url };
}

async function assertCustomerBinding(opts: {
  userId: string;
  customerId: string | null;
}): Promise<boolean> {
  const existing = await getSubscriptionRow(opts.userId);
  const owner = opts.customerId
    ? await findUserIdByStripeCustomerId(opts.customerId)
    : null;
  const ok = customerUserBindingOk({
    sessionCustomerId: opts.customerId,
    metadataUserId: opts.userId,
    existingUserCustomerId: existing?.stripeCustomerId ?? null,
    customerOwnerUserId: owner,
  });
  if (!ok) {
    log.warn(
      {
        userId: opts.userId,
        customerId: opts.customerId,
        existingCustomer: existing?.stripeCustomerId ?? null,
        owner,
      },
      "stripe customer/user binding mismatch — rejecting",
    );
  }
  return ok;
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId =
    session.metadata?.userId || session.client_reference_id || null;
  const plan = session.metadata?.plan;
  if (
    !userId ||
    (plan !== "one_time" && plan !== "monthly" && plan !== "yearly")
  ) {
    log.warn({ sessionId: session.id }, "checkout completed missing user/plan");
    return;
  }

  if (!isCheckoutPaymentSettled(session.payment_status)) {
    log.warn(
      { sessionId: session.id, paymentStatus: session.payment_status },
      "checkout completed but payment not settled — skipping Pro grant",
    );
    return;
  }

  const stripe = getStripe();
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price"],
  });

  const priceIds = sessionLinePriceIds(full);
  if (!sessionMatchesExpectedPrice(plan, priceIds)) {
    log.warn(
      { sessionId: session.id, plan, priceIds },
      "checkout line items do not match configured price — skipping",
    );
    return;
  }

  if (!sessionAmountPlausible(plan, full.amount_total, full.currency)) {
    log.warn(
      {
        sessionId: session.id,
        plan,
        amountTotal: full.amount_total,
        currency: full.currency,
      },
      "checkout amount/currency mismatch — skipping",
    );
    return;
  }

  const customerId =
    typeof full.customer === "string"
      ? full.customer
      : full.customer?.id ?? null;
  const subscriptionId =
    typeof full.subscription === "string"
      ? full.subscription
      : full.subscription?.id ?? null;

  if (!(await assertCustomerBinding({ userId, customerId }))) {
    return;
  }

  let currentPeriodEnd: Date | null = null;
  if (plan === "monthly" || plan === "yearly") {
    if (!subscriptionId) {
      log.warn(
        { sessionId: session.id, plan },
        "recurring checkout missing subscription",
      );
      return;
    }
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const mapped = mapStripeSubscriptionStatus(sub.status);
    if (mapped.action !== "activate") {
      log.warn(
        { sessionId: session.id, subStatus: sub.status },
        "subscription not active/trialing yet — skipping",
      );
      return;
    }
    if (!subscriptionMatchesMonthlyPrice(subscriptionPriceIds(sub))) {
      log.warn(
        { sessionId: session.id, subId: sub.id },
        "subscription price is not a configured Pro recurring price — skipping",
      );
      return;
    }
    currentPeriodEnd = periodEndFromSubscription(sub);
  }

  await activateCheckoutPlan({
    userId,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId:
      plan === "monthly" || plan === "yearly" ? subscriptionId : null,
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
  });
  log.info({ userId, plan, sessionId: session.id }, "Pro activated from checkout");
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId =
    sub.metadata?.userId || (await findUserIdByStripeCustomerId(customerId));
  if (!userId) {
    log.warn({ subId: sub.id, customerId }, "subscription update: unknown user");
    return;
  }

  if (!(await assertCustomerBinding({ userId, customerId }))) {
    return;
  }

  const priceMatched = subscriptionMatchesMonthlyPrice(
    subscriptionPriceIds(sub),
  );
  if (!priceMatched) {
    // Bound customer already verified above. Price IDs often drift after
    // re-running stripe-setup while an older subscription remains active —
    // still sync cancel_at_period_end / status or Pro stays wrong forever.
    log.warn(
      { userId, subId: sub.id, prices: subscriptionPriceIds(sub) },
      "subscription update price ≠ configured STRIPE_PRICE_* — syncing anyway",
    );
  }

  const mapped = mapStripeSubscriptionStatus(sub.status);
  if (mapped.action === "ignore") {
    log.info(
      { userId, subId: sub.id, status: sub.status },
      "subscription update ignored (e.g. incomplete)",
    );
    return;
  }
  if (mapped.action === "deactivate") {
    await deactivateMonthlySubscription(userId);
    log.info({ userId, subId: sub.id, status: sub.status }, "recurring deactivated");
    return;
  }

  const plan =
    recurringPlanFromPriceIds(subscriptionPriceIds(sub)) ??
    (sub.metadata?.plan === "yearly" ? "yearly" : "monthly");

  await activateCheckoutPlan({
    userId,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEndFromSubscription(sub),
    cancelAtPeriodEnd: Boolean(
      sub.cancel_at_period_end ||
        (typeof sub.cancel_at === "number" && sub.cancel_at > 0),
    ),
  });
  log.info(
    {
      userId,
      subId: sub.id,
      status: mapped.status,
      plan,
      cancelAtPeriodEnd: Boolean(
        sub.cancel_at_period_end ||
          (typeof sub.cancel_at === "number" && sub.cancel_at > 0),
      ),
    },
    "recurring subscription synced",
  );
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId =
    sub.metadata?.userId || (await findUserIdByStripeCustomerId(customerId));
  if (!userId) return;

  if (!(await assertCustomerBinding({ userId, customerId }))) {
    return;
  }

  // Only deactivate if this is our tracked monthly sub, or price matches Pro monthly.
  const existing = await getSubscriptionRow(userId);
  const isTracked =
    existing?.stripeSubscriptionId != null &&
    existing.stripeSubscriptionId === sub.id;
  const isOurPrice = subscriptionMatchesMonthlyPrice(subscriptionPriceIds(sub));
  if (!isTracked && !isOurPrice) {
    log.warn(
      { userId, subId: sub.id },
      "subscription.deleted ignored — not our Pro subscription",
    );
    return;
  }

  await deactivateMonthlySubscription(userId);
  log.info({ userId, subId: sub.id }, "monthly deleted → deactivated");
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
      );
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
      );
      break;
    default:
      break;
  }
}

export { userEmail };
