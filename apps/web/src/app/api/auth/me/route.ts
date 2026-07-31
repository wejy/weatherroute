import { NextResponse } from "next/server";
import { getCurrentUser, signOut } from "@/server/auth/session";
import { authSessionCookieName } from "@/server/auth/mobile-session";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

export async function DELETE() {
  await signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(authSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}
