"use client";

import type { ReactNode } from "react";
import { AppGoogleAnalytics } from "@/components/analytics/google-analytics";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { ConsentPreferencesDialog } from "@/components/consent/consent-preferences-dialog";
import {
  ConsentProvider,
  useConsent,
} from "@/components/consent/consent-provider";
import type { ConsentPreferences } from "@/lib/consent";

function ConsentAnalytics() {
  const { analyticsEnabled } = useConsent();
  return <AppGoogleAnalytics enabled={analyticsEnabled} />;
}

export function ConsentRoot({
  initialConsent,
  children,
}: {
  initialConsent: ConsentPreferences | null;
  children: ReactNode;
}) {
  return (
    <ConsentProvider initialConsent={initialConsent}>
      {children}
      <ConsentBanner />
      <ConsentPreferencesDialog />
      <ConsentAnalytics />
    </ConsentProvider>
  );
}
