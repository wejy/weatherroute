/** Cookie consent preference storage (shared server + client parse). */
export const CONSENT_COOKIE = "wt_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ConsentPreferences = {
  v: number;
  analytics: boolean;
  updatedAt: string;
};

export function defaultConsent(now = new Date()): ConsentPreferences {
  return {
    v: CONSENT_VERSION,
    analytics: false,
    updatedAt: now.toISOString(),
  };
}

export function parseConsentCookie(raw: string | null | undefined): ConsentPreferences | null {
  if (!raw?.trim()) return null;
  try {
    const data = JSON.parse(raw) as Partial<ConsentPreferences>;
    if (data.v !== CONSENT_VERSION) return null;
    if (typeof data.analytics !== "boolean") return null;
    if (typeof data.updatedAt !== "string" || !data.updatedAt) return null;
    return {
      v: CONSENT_VERSION,
      analytics: data.analytics,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeConsent(prefs: ConsentPreferences): string {
  return JSON.stringify({
    v: prefs.v,
    analytics: prefs.analytics,
    updatedAt: prefs.updatedAt,
  });
}

export function hasConsentChoice(prefs: ConsentPreferences | null): prefs is ConsentPreferences {
  return prefs != null;
}

export function shouldLoadAnalytics(prefs: ConsentPreferences | null): boolean {
  return Boolean(prefs?.analytics);
}

/** Inline boot — set Google Consent Mode defaults before GA loads. */
export const CONSENT_MODE_DEFAULT_SCRIPT = `(function(){window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});})();`;
