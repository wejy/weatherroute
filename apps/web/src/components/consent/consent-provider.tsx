"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  hasConsentChoice,
  shouldLoadAnalytics,
  type ConsentPreferences,
} from "@/lib/consent";
import {
  acceptAllConsent,
  applyAnalyticsConsentGranted,
  rejectNonEssentialConsent,
  saveAnalyticsPreference,
} from "@/lib/consent-client";

type ConsentContextValue = {
  consent: ConsentPreferences | null;
  hasChoice: boolean;
  analyticsEnabled: boolean;
  preferencesOpen: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (analytics: boolean) => void;
  openPreferences: () => void;
  closePreferences: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({
  initialConsent,
  children,
}: {
  initialConsent: ConsentPreferences | null;
  children: ReactNode;
}) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(initialConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (consent?.analytics) {
      applyAnalyticsConsentGranted();
    }
  }, [consent?.analytics]);

  const acceptAll = useCallback(() => {
    setConsent(acceptAllConsent());
    setPreferencesOpen(false);
  }, []);

  const rejectNonEssential = useCallback(() => {
    setConsent(rejectNonEssentialConsent());
    setPreferencesOpen(false);
  }, []);

  const savePreferences = useCallback((analytics: boolean) => {
    setConsent(saveAnalyticsPreference(analytics));
    setPreferencesOpen(false);
  }, []);

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  const value = useMemo(
    () => ({
      consent,
      hasChoice: hasConsentChoice(consent),
      analyticsEnabled: shouldLoadAnalytics(consent),
      preferencesOpen,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      openPreferences,
      closePreferences,
    }),
    [
      acceptAll,
      closePreferences,
      consent,
      openPreferences,
      preferencesOpen,
      rejectNonEssential,
      savePreferences,
    ],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return ctx;
}

export function useConsentOptional(): ConsentContextValue | null {
  return useContext(ConsentContext);
}
