import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { createBillingPortalSession } from "@/server/billing/checkout";
import { withApiLog } from "@/lib/api-log";

export async function POST(request: Request) {
  return withApiLog(request, "billing.portal", async ({ log }) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        { error: "billing_unavailable" },
        { status: 503 },
      );
    }
    try {
      let returnToApp = false;
      try {
        const body = await request.json();
        returnToApp = Boolean(
          body &&
            typeof body === "object" &&
            (body as { returnToApp?: unknown }).returnToApp === true,
        );
      } catch {
        // empty body is fine
      }
      const session = await createBillingPortalSession({
        userId: user.id,
        email: user.email,
        returnToApp,
      });
      log.info({ userId: user.id, returnToApp }, "portal session created");
      return NextResponse.json({ url: session.url });
    } catch (err) {
      log.error({ err, userId: user.id }, "portal failed");
      return NextResponse.json({ error: "portal_failed" }, { status: 500 });
    }
  });
}
