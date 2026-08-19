"use client";

import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_VERSION,
  defaultConsent,
  parseConsentCookie,
  serializeConsent,
  type ConsentPreferences,
} from "@/lib/consent";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function readConsentFromDocument(): ConsentPreferences | null {
  return parseConsentCookie(readCookie(CONSENT_COOKIE));
}

export function writeConsent(analytics: boolean): ConsentPreferences {
  const prefs: ConsentPreferences = {
    v: CONSENT_VERSION,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsent(prefs))}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  return prefs;
}

export function clearGaCookies(): void {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const paths = ["/", ""];

  for (const name of document.cookie.split(";").map((c) => c.trim().split("=")[0])) {
    if (!name?.startsWith("_ga")) continue;
    for (const path of paths) {
      document.cookie = `${name}=; Path=${path || "/"}; Max-Age=0; SameSite=Lax`;
      document.cookie = `${name}=; Path=${path || "/"}; Max-Age=0; Domain=${host}; SameSite=Lax`;
      document.cookie = `${name}=; Path=${path || "/"}; Max-Age=0; Domain=.${host}; SameSite=Lax`;
    }
  }
}

export function applyAnalyticsConsentGranted(): void {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: "granted",
  });
}

export function applyAnalyticsConsentDenied(): void {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: "denied",
  });
  clearGaCookies();
}

export function acceptAllConsent(): ConsentPreferences {
  const prefs = writeConsent(true);
  applyAnalyticsConsentGranted();
  return prefs;
}

export function rejectNonEssentialConsent(): ConsentPreferences {
  const prefs = writeConsent(false);
  applyAnalyticsConsentDenied();
  return prefs;
}

export function saveAnalyticsPreference(enabled: boolean): ConsentPreferences {
  if (enabled) {
    return acceptAllConsent();
  }
  return rejectNonEssentialConsent();
}

export { defaultConsent };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
