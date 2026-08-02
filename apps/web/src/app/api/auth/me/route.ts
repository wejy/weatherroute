import { NextResponse } from "next/server";
import { getCurrentUser, signOut } from "@/server/auth/session";
import { authSessionCookieName } from "@/server/auth/mobile-session";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: Request) {
  return withApiLog(request, "auth.me", async ({ log }) => {
    const user = await getCurrentUser();
    log.info({ signedIn: Boolean(user), userId: user?.id ?? null }, "me");
    return NextResponse.json({ user });
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
