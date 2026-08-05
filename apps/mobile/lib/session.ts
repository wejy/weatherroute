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

export type DiscoverTier = "anon" | "free" | "pro";

export type BillingPlan = "free" | "one_time" | "monthly" | "yearly";

export type SessionSnapshot = {
  user: SessionUser | null;
  tier: DiscoverTier;
  plan: BillingPlan;
  sameCountryOnly: boolean;
  sameCountryOnlyEffective: boolean;
  canManageBilling: boolean;
  canSaveTrip: boolean;
  maxSavedTrips: number | null;
  savedTripCount: number;
  proSince: string | null;
  currentPeriodEnd: string | null;
  oneTimePaidAt: string | null;
  oneTimeExpiresAt: string | null;
};

export async function fetchSession(): Promise<SessionSnapshot> {
  try {
    const data = await apiGet<{
      user: SessionUser | null;
      tier?: DiscoverTier;
      plan?: BillingPlan;
      sameCountryOnly?: boolean;
      sameCountryOnlyEffective?: boolean;
      canManageBilling?: boolean;
      canSaveTrip?: boolean;
      maxSavedTrips?: number | null;
      savedTripCount?: number;
      proSince?: string | null;
      currentPeriodEnd?: string | null;
      oneTimePaidAt?: string | null;
      oneTimeExpiresAt?: string | null;
    }>("/api/auth/me");
    return {
      user: data.user,
      tier: data.tier ?? (data.user ? "free" : "anon"),
      plan: data.plan ?? "free",
      sameCountryOnly: Boolean(data.sameCountryOnly),
      sameCountryOnlyEffective: Boolean(data.sameCountryOnlyEffective),
      canManageBilling: Boolean(data.canManageBilling),
      canSaveTrip: Boolean(data.canSaveTrip),
      maxSavedTrips: data.maxSavedTrips ?? null,
      savedTripCount: data.savedTripCount ?? 0,
      proSince: data.proSince ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      oneTimePaidAt: data.oneTimePaidAt ?? null,
      oneTimeExpiresAt: data.oneTimeExpiresAt ?? null,
    };
  } catch (err) {
    log.warn({ err }, "fetchSession failed");
    return {
      user: null,
      tier: "anon",
      plan: "free",
      sameCountryOnly: false,
      sameCountryOnlyEffective: false,
      canManageBilling: false,
      canSaveTrip: false,
      maxSavedTrips: null,
      savedTripCount: 0,
      proSince: null,
      currentPeriodEnd: null,
      oneTimePaidAt: null,
      oneTimeExpiresAt: null,
    };
  }
}

export async function fetchCurrentUser(): Promise<SessionUser | null> {
  const { user } = await fetchSession();
  return user;
}

export async function requestOtp(
  email: string,
  opts?: { locale?: "en" | "fi" },
): Promise<void> {
  log.info({ email }, "request OTP");
  await apiPost<{ ok: boolean }>("/api/auth/request-otp", {
    email,
    ...(opts?.locale ? { locale: opts.locale } : {}),
  });
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
