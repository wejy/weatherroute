import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { BILLING_PLANS } from "@/server/billing/plans";
import { getStripe } from "@/server/billing/stripe";

const log = createModuleLogger("billing.invoices");

export type CustomerPayment = {
  id: string;
  paidAt: string;
  amountCents: number;
  currency: string;
};

/**
 * Paid Stripe invoices for a customer (newest first).
 * Empty on missing key / API error — callers still show status UI.
 */
export async function listCustomerPayments(
  stripeCustomerId: string,
): Promise<CustomerPayment[]> {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return [];
  try {
    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      status: "paid",
      limit: 24,
    });
    return invoices.data
      .map((inv) => {
        const id = inv.id;
        if (!id) return null;
        const paidUnix =
          inv.status_transitions?.paid_at ?? inv.created ?? null;
        if (paidUnix == null) return null;
        return {
          id,
          paidAt: new Date(paidUnix * 1000).toISOString(),
          amountCents: inv.amount_paid ?? 0,
          currency: (inv.currency || "eur").toLowerCase(),
        } satisfies CustomerPayment;
      })
      .filter((row): row is CustomerPayment => row != null)
      .sort(
        (a, b) =>
          new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      );
  } catch (err) {
    log.warn({ err, stripeCustomerId }, "listCustomerPayments failed");
    return [];
  }
}

/**
 * When one-time Checkout predates invoice_creation, synthesize a row from DB.
 */
export function fallbackOneTimePayment(opts: {
  oneTimePaidAt: string | null;
  existing: CustomerPayment[];
}): CustomerPayment[] {
  if (!opts.oneTimePaidAt || opts.existing.length > 0) return opts.existing;
  return [
    {
      id: "one_time_local",
      paidAt: opts.oneTimePaidAt,
      amountCents: BILLING_PLANS.one_time.amountCents,
      currency: BILLING_PLANS.one_time.currency,
    },
  ];
}

export function formatPaymentAmount(
  amountCents: number,
  currency: string,
  locale: "en" | "fi",
): string {
  const tag = locale === "fi" ? "fi-FI" : "en-GB";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}
