"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "@/server/billing/checkout";
import { isStripeBillingConfigured, type CheckoutPlan } from "@/server/billing/plans";

function parsePlan(raw: FormDataEntryValue | null): CheckoutPlan | null {
  const v = String(raw || "");
  if (v === "one_time" || v === "monthly") return v;
  return null;
}

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function startCheckoutAction(formData: FormData) {
  const user = await requireUser();
  if (!isStripeBillingConfigured()) {
    redirect("/pro?checkout=unavailable");
  }
  const plan = parsePlan(formData.get("plan"));
  if (!plan) {
    redirect("/pro?checkout=invalid");
  }
  try {
    const { url } = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      plan,
    });
    redirect(url);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    redirect("/pro?checkout=error");
  }
}

export async function openBillingPortalAction() {
  const user = await requireUser();
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    redirect("/settings?billing=unavailable");
  }
  try {
    const { url } = await createBillingPortalSession({
      userId: user.id,
      email: user.email,
    });
    redirect(url);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    redirect("/settings?billing=error");
  }
}
