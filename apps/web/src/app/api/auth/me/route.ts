import { NextResponse } from "next/server";
import { getCurrentUser, signOut } from "@/server/auth/session";
import { authSessionCookieName } from "@/server/auth/mobile-session";
import {
  getEffectiveSameCountryOnly,
  resolveUserTier,
} from "@/server/dal/user-prefs";
import { getBillingEntitlement } from "@/server/dal/subscriptions";
import { getUserRole } from "@/server/dal/roles";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: Request) {
  return withApiLog(request, "auth.me", async ({ log }) => {
    const user = await getCurrentUser();
    const tier = await resolveUserTier(user?.id ?? null);
    const billing = await getBillingEntitlement(user?.id ?? null);
    const sameCountry = user
      ? await getEffectiveSameCountryOnly()
      : { preference: false, effective: false, tier };
    log.info(
      {
        signedIn: Boolean(user),
        userId: user?.id ?? null,
        tier,
        plan: billing.plan,
      },
      "me",
    );
    return NextResponse.json({
      user,
      tier,
      plan: billing.plan,
      role: user ? await getUserRole(user.id) : "user",
      maxSavedTrips: billing.maxSavedTrips,
      savedTripCount: billing.savedTripCount,
      canSaveTrip: billing.canSaveTrip,
      canManageBilling: billing.canManageBilling,
      proSince: billing.proSince,
      currentPeriodEnd: billing.currentPeriodEnd,
      oneTimePaidAt: billing.oneTimePaidAt,
      oneTimeExpiresAt: billing.oneTimeExpiresAt,
      sameCountryOnly: sameCountry.preference,
      sameCountryOnlyEffective: sameCountry.effective,
    });
  });
}

export async function DELETE(request: Request) {
  return withApiLog(request, "auth.signout", async ({ log }) => {
    const before = await getCurrentUser();
    await signOut();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(authSessionCookieName(), "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
    log.info({ userId: before?.id ?? null }, "signed out");
    return res;
  });
}
