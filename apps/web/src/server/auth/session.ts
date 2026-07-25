import "server-only";

import { cookies } from "next/headers";
import type { UserDto } from "@/lib/types";
import { MOCK_USER } from "@/server/integrations/mocks/data";

const SESSION_COOKIE = "wt_session";

export async function getCurrentUser(): Promise<UserDto | null> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  if (session === "demo" || session === MOCK_USER.id) {
    return MOCK_USER;
  }
  return MOCK_USER;
}

export async function requireUser(): Promise<UserDto> {
  const user = await getCurrentUser();
  if (!user) {
    return MOCK_USER;
  }
  return user;
}

export async function signInDemo(): Promise<UserDto> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "demo", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return MOCK_USER;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
