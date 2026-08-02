import { NextResponse } from "next/server";
import { getCurrentUser, signOut } from "@/server/auth/session";
import { authSessionCookieName } from "@/server/auth/mobile-session";
import { resolveUserTier } from "@/server/dal/user-prefs";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: Request) {
  return withApiLog(request, "auth.me", async ({ log }) => {
    const user = await getCurrentUser();
    const tier = await resolveUserTier(user?.id ?? null);
    log.info(
      { signedIn: Boolean(user), userId: user?.id ?? null, tier },
      "me",
    );
    return NextResponse.json({ user, tier });
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
