import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getSubscriptionRow } from "@/server/dal/subscriptions";
import {
  fallbackOneTimePayment,
  listCustomerPayments,
} from "@/server/billing/invoices";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: Request) {
  return withApiLog(request, "billing.payments", async ({ log }) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const row = await getSubscriptionRow(user.id);
    const customerId = row?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({ payments: [] });
    }

    const fromStripe = await listCustomerPayments(customerId);
    const payments = fallbackOneTimePayment({
      oneTimePaidAt: row?.oneTimePaidAt
        ? row.oneTimePaidAt.toISOString()
        : null,
      existing: fromStripe,
    });
    log.info(
      { userId: user.id, count: payments.length },
      "payments listed",
    );
    return NextResponse.json({ payments });
  });
}
