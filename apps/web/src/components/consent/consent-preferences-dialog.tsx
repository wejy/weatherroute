"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/locale-provider";
import { useConsent } from "@/components/consent/consent-provider";

export function ConsentPreferencesDialog() {
  const { t } = useI18n();
  const {
    consent,
    preferencesOpen,
    closePreferences,
    savePreferences,
    acceptAll,
    rejectNonEssential,
  } = useConsent();
  const dialogId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [analytics, setAnalytics] = useState(Boolean(consent?.analytics));

  useEffect(() => {
    if (preferencesOpen) {
      setAnalytics(Boolean(consent?.analytics));
    }
  }, [consent?.analytics, preferencesOpen]);

  useEffect(() => {
    if (!preferencesOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePreferences();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closePreferences, preferencesOpen]);

  useEffect(() => {
    if (!preferencesOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [preferencesOpen]);

  if (!preferencesOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-inverse-surface/45 backdrop-blur-[2px]"
        aria-label={t("consent.preferencesTitle")}
        onClick={closePreferences}
      />
      <div
        ref={panelRef}
        id={dialogId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        className="fixed inset-x-4 top-1/2 z-[61] max-h-[min(85vh,32rem)] w-auto -translate-y-1/2 overflow-y-auto rounded-2xl border border-outline-variant/25 bg-surface p-5 shadow-[0px_16px_48px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2"
      >
        <h2
          id={`${dialogId}-title`}
          className="text-lg font-semibold text-on-surface"
        >
          {t("consent.preferencesTitle")}
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          {t("consent.description")}{" "}
          <Link
            href="/about#cookies"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={closePreferences}
          >
            {t("consent.policyLink")}
          </Link>
        </p>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-4">
            <p className="text-sm font-semibold text-on-surface">
              {t("consent.necessaryLabel")}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {t("consent.necessaryDescription")}
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-4">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="mt-1 size-4 rounded border-outline-variant accent-primary"
            />
            <span>
              <span className="block text-sm font-semibold text-on-surface">
                {t("consent.analyticsLabel")}
              </span>
              <span className="mt-1 block text-sm text-on-surface-variant">
                {t("consent.analyticsDescription")}
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => savePreferences(analytics)}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
          >
            {t("consent.save")}
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            {t("consent.acceptAll")}
          </button>
          <button
            type="button"
            onClick={rejectNonEssential}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            {t("consent.rejectNonEssential")}
          </button>
        </div>
      </div>
    </>
  );
}
