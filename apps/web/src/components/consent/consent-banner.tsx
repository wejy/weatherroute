"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/locale-provider";
import { useConsent } from "@/components/consent/consent-provider";
import { isGoogleAnalyticsEnabled } from "@/lib/analytics";

export function ConsentBanner() {
  const { t } = useI18n();
  const { hasChoice, acceptAll, rejectNonEssential, openPreferences } =
    useConsent();

  if (hasChoice || !isGoogleAnalyticsEnabled()) return null;

  return (
    <div
      role="region"
      aria-label={t("consent.title")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant/30 bg-surface/98 p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl md:bottom-4 md:mx-auto md:max-w-3xl md:rounded-2xl md:border"
    >
      <p className="text-sm font-semibold text-on-surface">{t("consent.title")}</p>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
        {t("consent.description")}{" "}
        <Link
          href="/about#cookies"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {t("consent.policyLink")}
        </Link>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={acceptAll}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
        >
          {t("consent.acceptAll")}
        </button>
        <button
          type="button"
          onClick={rejectNonEssential}
          className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
        >
          {t("consent.rejectNonEssential")}
        </button>
        <button
          type="button"
          onClick={openPreferences}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          {t("consent.customize")}
        </button>
      </div>
    </div>
  );
}
