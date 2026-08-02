import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "@/server/billing/checkout";
import {
  isStripeBillingConfigured,
  type CheckoutPlan,
} from "@/server/billing/plans";
import { withApiLog } from "@/lib/api-log";

function parsePlan(raw: unknown): CheckoutPlan | null {
  if (raw === "one_time" || raw === "monthly") return raw;
  return null;
}

export async function POST(request: Request) {
  return withApiLog(request, "billing.checkout", async ({ log }) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!isStripeBillingConfigured()) {
      return NextResponse.json(
        { error: "billing_unavailable" },
        { status: 503 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const plan = parsePlan(
      body && typeof body === "object"
        ? (body as { plan?: unknown }).plan
        : null,
    );
    if (!plan) {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    }

    try {
      const session = await createCheckoutSession({
        userId: user.id,
        email: user.email,
        plan,
      });
      log.info({ userId: user.id, plan }, "checkout session created");
      return NextResponse.json({ url: session.url });
    } catch (err) {
      log.error({ err, userId: user.id, plan }, "checkout failed");
      return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
    }
  });
}
