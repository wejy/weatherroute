import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { cookies, headers } from "next/headers";
import type { UserDto } from "@/lib/types";
import { auth, signIn, signOut as authSignOut } from "@/server/auth/auth";
import { MOCK_USER } from "@/server/integrations/mocks/data";
import { env, hasDatabase } from "@/lib/env";
import { decodeAuthSessionToken } from "@/server/auth/mobile-session";

const log = createModuleLogger("server.auth.session");
const DEMO_COOKIE = "wt_session";
const MOBILE_SESSION_HEADER = "x-weathertrip-session";

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

async function userFromMobileHeader(): Promise<UserDto | null> {
  try {
    const h = await headers();
    const token = h.get(MOBILE_SESSION_HEADER)?.trim();
    if (!token) return null;
    const decoded = await decodeAuthSessionToken(token);
    if (!decoded) return null;
    return toUserDto({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    });
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserDto | null> {
  const fromHeader = await userFromMobileHeader();
  if (fromHeader) return fromHeader;

  if (env.isProduction) {
    try {
      const session = await auth();
      if (!session?.user?.id) return null;
      return toUserDto(session.user);
    } catch (error) {
      log.warn({ err: error }, "[auth] getCurrentUser failed");
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
    log.warn({ err: error }, "[auth] getCurrentUser failed");
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
