import "./load-env";
import Stripe from "stripe";

/**
 * Creates Solviax.app Pro products/prices (VAT-inclusive EUR):
 *   One-time €1.99 · Monthly €2.99 · Yearly €30
 * Prints env vars to paste into apps/web/.env.local
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts
 */

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error("Set STRIPE_SECRET_KEY first.");
    process.exit(1);
  }

  const stripe = new Stripe(key);

  const oneTimeProduct = await stripe.products.create({
    name: "Solviax.app Pro — One-time",
    description: "Pro features + up to 2 saved routes (60 days)",
    metadata: { plan: "one_time" },
    tax_code: "txcd_10000000",
  });
  const oneTimePrice = await stripe.prices.create({
    product: oneTimeProduct.id,
    currency: "eur",
    unit_amount: 199,
    tax_behavior: "inclusive",
    metadata: { plan: "one_time" },
  });

  const monthlyProduct = await stripe.products.create({
    name: "Solviax.app Pro — Monthly",
    description: "Pro features + unlimited saved routes",
    metadata: { plan: "monthly" },
    tax_code: "txcd_10000000",
  });
  const monthlyPrice = await stripe.prices.create({
    product: monthlyProduct.id,
    currency: "eur",
    unit_amount: 299,
    tax_behavior: "inclusive",
    recurring: { interval: "month" },
    metadata: { plan: "monthly" },
  });

  const yearlyProduct = await stripe.products.create({
    name: "Solviax.app Pro — Yearly",
    description: "Pro features + unlimited saved routes (billed yearly)",
    metadata: { plan: "yearly" },
    tax_code: "txcd_10000000",
  });
  const yearlyPrice = await stripe.prices.create({
    product: yearlyProduct.id,
    currency: "eur",
    unit_amount: 3000,
    tax_behavior: "inclusive",
    recurring: { interval: "year" },
    metadata: { plan: "yearly" },
  });

  console.log("\nAdd these to apps/web/.env.local:\n");
  console.log(`STRIPE_SECRET_KEY=${key}`);
  console.log(`STRIPE_PRICE_ONE_TIME=${oneTimePrice.id}`);
  console.log(`STRIPE_PRICE_MONTHLY=${monthlyPrice.id}`);
  console.log(`STRIPE_PRICE_YEARLY=${yearlyPrice.id}`);
  console.log(
    "STRIPE_WEBHOOK_SECRET=whsec_...  # from: stripe listen --forward-to localhost:3004/api/stripe/webhook",
  );
  console.log("\nProducts created (VAT-inclusive):");
  console.log(`  one_time €1.99 product=${oneTimeProduct.id} price=${oneTimePrice.id}`);
  console.log(`  monthly  €2.99 product=${monthlyProduct.id} price=${monthlyPrice.id}`);
  console.log(`  yearly   €30   product=${yearlyProduct.id} price=${yearlyPrice.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
