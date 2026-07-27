import "server-only";

import { cookies } from "next/headers";
import type { UserDto } from "@/lib/types";
import { auth, signIn, signOut as authSignOut } from "@/server/auth/auth";
import { MOCK_USER } from "@/server/integrations/mocks/data";
import { env, hasDatabase } from "@/lib/env";

const DEMO_COOKIE = "wt_session";

function toUserDto(user: {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): UserDto {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: user.name || user.email?.split("@")[0] || "Traveler",
    avatarUrl: user.image ?? undefined,
  };
}

export async function getCurrentUser(): Promise<UserDto | null> {
  if (env.isProduction) {
    try {
      const session = await auth();
      if (!session?.user?.id) return null;
      return toUserDto(session.user);
    } catch (error) {
      console.warn("[auth] getCurrentUser failed", error);
      return null;
    }
  }

  if (env.useMocks || !hasDatabase()) {
    const jar = await cookies();
    const session = jar.get(DEMO_COOKIE)?.value;
    if (session === "demo" || session === MOCK_USER.id) return MOCK_USER;
    return null;
  }

  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    return toUserDto(session.user);
  } catch (error) {
    console.warn("[auth] getCurrentUser failed", error);
    return null;
  }
}

export async function requireUser(): Promise<UserDto> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/** Demo login when USE_MOCKS=true / no database. Disabled in production. */
export async function signInDemo(): Promise<UserDto> {
  if (env.isProduction) {
    throw new Error("Demo login is disabled in production");
  }
  if (hasDatabase() && !env.useMocks) {
    throw new Error("Demo login disabled when database auth is configured");
  }
  const jar = await cookies();
  jar.set(DEMO_COOKIE, "demo", {
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
  jar.delete(DEMO_COOKIE);
  try {
    await authSignOut({ redirect: false });
  } catch {
    // ignore
  }
}

export async function signInWithOtp(email: string, code: string): Promise<void> {
  const result = await signIn("email-otp", {
    email,
    code,
    redirect: false,
  });
  if (result?.error) {
    throw new Error(result.error);
  }
}
