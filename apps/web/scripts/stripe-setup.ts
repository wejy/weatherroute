import "./load-env";
import Stripe from "stripe";

/**
 * Creates Solviax.app One-time (€1) and Monthly (€2.80) products/prices in Stripe.
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
    description: "Pro features + up to 2 saved routes",
    metadata: { plan: "one_time" },
  });
  const oneTimePrice = await stripe.prices.create({
    product: oneTimeProduct.id,
    currency: "eur",
    unit_amount: 100,
    metadata: { plan: "one_time" },
  });

  const monthlyProduct = await stripe.products.create({
    name: "Solviax.app Pro — Monthly",
    description: "Pro features + unlimited saved routes",
    metadata: { plan: "monthly" },
  });
  const monthlyPrice = await stripe.prices.create({
    product: monthlyProduct.id,
    currency: "eur",
    unit_amount: 280,
    recurring: { interval: "month" },
    metadata: { plan: "monthly" },
  });

  console.log("\nAdd these to apps/web/.env.local:\n");
  console.log(`STRIPE_SECRET_KEY=${key}`);
  console.log(`STRIPE_PRICE_ONE_TIME=${oneTimePrice.id}`);
  console.log(`STRIPE_PRICE_MONTHLY=${monthlyPrice.id}`);
  console.log(
    "STRIPE_WEBHOOK_SECRET=whsec_...  # from: stripe listen --forward-to localhost:3000/api/stripe/webhook",
  );
  console.log("\nProducts created:");
  console.log(`  one_time product=${oneTimeProduct.id} price=${oneTimePrice.id}`);
  console.log(`  monthly  product=${monthlyProduct.id} price=${monthlyPrice.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
