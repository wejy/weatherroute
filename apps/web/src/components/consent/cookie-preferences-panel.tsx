"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/locale-provider";
import { useConsentOptional } from "@/components/consent/consent-provider";
import { isGoogleAnalyticsEnabled } from "@/lib/analytics";

export function CookiePreferencesPanel() {
  const { t } = useI18n();
  const consent = useConsentOptional();
  const gaConfigured = isGoogleAnalyticsEnabled();

  if (!gaConfigured) {
    return (
      <p className="text-sm text-on-surface-variant">
        {t("consent.necessaryDescription")}{" "}
        <Link
          href="/about#cookies"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {t("consent.policyLink")}
        </Link>
      </p>
    );
  }

  const analytics = Boolean(consent?.consent?.analytics);

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-on-surface">
        <input
          type="checkbox"
          checked={analytics}
          onChange={(event) =>
            consent?.savePreferences(event.target.checked)
          }
          className="mt-1 size-4 rounded border-outline-variant accent-primary"
        />
        <span>
          {t("consent.analyticsLabel")}
          <span className="mt-1 block text-xs font-normal text-on-surface-variant">
            {t("consent.analyticsDescription")}
          </span>
        </span>
      </label>
      <p className="text-xs text-on-surface-variant">
        {t("consent.necessaryDescription")}{" "}
        <Link
          href="/about#cookies"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {t("consent.policyLink")}
        </Link>
      </p>
    </div>
  );
}
