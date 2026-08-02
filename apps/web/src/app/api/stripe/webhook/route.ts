import { NextResponse } from "next/server";
import { getStripe, getStripeWebhookSecret } from "@/server/billing/stripe";
import { handleStripeEvent } from "@/server/billing/checkout";
import { createModuleLogger } from "@/lib/logger";

export const runtime = "nodejs";

const log = createModuleLogger("stripe.webhook");

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (err) {
    log.warn({ err }, "webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    log.error({ err, type: event.type }, "webhook handler failed");
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
