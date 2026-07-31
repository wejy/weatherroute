import { apiDelete, apiGet, apiPost } from "@/lib/api";
import {
  clearSession,
  setSession,
} from "@/lib/session-store";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export async function fetchCurrentUser(): Promise<SessionUser | null> {
  try {
    const data = await apiGet<{ user: SessionUser | null }>("/api/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function requestOtp(email: string): Promise<void> {
  await apiPost<{ ok: boolean }>("/api/auth/request-otp", { email });
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<SessionUser> {
  const data = await apiPost<{
    ok: boolean;
    user: SessionUser;
    sessionToken: string;
    sessionCookie: string;
  }>("/api/auth/verify-otp", { email, code });

  await setSession({
    sessionToken: data.sessionToken,
    sessionCookie: data.sessionCookie,
  });
  return data.user;
}

export async function signOutRemote(): Promise<void> {
  try {
    await apiDelete<{ ok: boolean }>("/api/auth/me");
  } catch {
    // ignore network errors on sign-out
  }
  await clearSession();
}

export { clearSession, getSessionToken } from "@/lib/session-store";
