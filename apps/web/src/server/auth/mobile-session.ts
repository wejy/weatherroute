import "server-only";

import { encode, decode } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/env";

/** Auth.js v5 cookie name / JWT salt (must match). */
export function authSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

export async function encodeAuthSessionToken(user: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const salt = authSessionCookieName();
  return encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name ?? user.email.split("@")[0],
    },
    secret: getAuthSecret(),
    salt,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function decodeAuthSessionToken(token: string): Promise<{
  id: string;
  email: string;
  name?: string;
} | null> {
  try {
    const salt = authSessionCookieName();
    const decoded = await decode({
      token,
      secret: getAuthSecret(),
      salt,
    });
    if (!decoded?.sub) return null;
    return {
      id: decoded.sub,
      email: typeof decoded.email === "string" ? decoded.email : "",
      name: typeof decoded.name === "string" ? decoded.name : undefined,
    };
  } catch {
    return null;
  }
}
