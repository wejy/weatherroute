import { apiDelete, apiGet, apiPost } from "@/lib/api";
import {
  clearSession,
  setSession,
} from "@/lib/session-store";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("session");

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export async function fetchCurrentUser(): Promise<SessionUser | null> {
  try {
    const data = await apiGet<{ user: SessionUser | null }>("/api/auth/me");
    return data.user;
  } catch (err) {
    log.warn({ err }, "fetchCurrentUser failed");
    return null;
  }
}

export async function requestOtp(email: string): Promise<void> {
  log.info({ email }, "request OTP");
  await apiPost<{ ok: boolean }>("/api/auth/request-otp", { email });
  log.info({ email }, "OTP requested");
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<SessionUser> {
  log.info({ email }, "verify OTP");
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
  log.info({ email, userId: data.user.id }, "signed in");
  return data.user;
}

export async function signOutRemote(): Promise<void> {
  try {
    await apiDelete<{ ok: boolean }>("/api/auth/me");
    log.info("signed out remotely");
  } catch (err) {
    log.warn({ err }, "sign-out request failed; clearing local session");
  }
  await clearSession();
}

export { clearSession, getSessionToken } from "@/lib/session-store";
