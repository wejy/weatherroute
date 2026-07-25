"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  maxForecastDateKey,
  minForecastDateKey,
  resolveDateWindow,
  type DatePreset,
  type DateWindow,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";

const PRESET_META: { value: DatePreset; icon: string; labelKey: string }[] = [
  { value: "today", icon: "today", labelKey: "dates.today" },
  { value: "tomorrow", icon: "event", labelKey: "dates.tomorrow" },
  { value: "weekend", icon: "date_range", labelKey: "dates.weekend" },
  { value: "custom", icon: "edit_calendar", labelKey: "dates.custom" },
];

export function DestinationDateFilters({
  initial,
}: {
  initial: DateWindow;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(initial.preset === "custom");
  const [draft, setDraft] = useState(initial);

  const min = useMemo(() => minForecastDateKey(), []);
  const max = useMemo(() => maxForecastDateKey(), []);

  function applyWindow(next: DateWindow) {
    setDraft(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("datePreset", next.preset);
    params.set("startDate", next.startDate);
    params.set("endDate", next.endDate);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function selectPreset(preset: DatePreset) {
    if (preset === "custom") {
      const next = resolveDateWindow({
        preset: "custom",
        startDate: draft.startDate || min,
        endDate: draft.endDate || draft.startDate || min,
        locale,
      });
      setDraft(next);
      setCustomOpen(true);
      applyWindow(next);
      return;
    }
    setCustomOpen(false);
    applyWindow(resolveDateWindow({ preset, locale }));
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-opacity",
        pending && "opacity-70",
      )}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium tracking-wide text-on-surface-variant uppercase">
            {t("dates.tripTimeframe")}
          </p>
          <p className="mt-1 text-lg font-semibold text-on-surface">
            {draft.preset === "custom" ? draft.rangeLabel : draft.label}
            {draft.preset !== "custom" && (
              <span className="ml-2 text-sm font-normal text-on-surface-variant">
                {draft.rangeLabel}
              </span>
            )}
          </p>
        </div>
        {pending && (
          <span className="text-xs font-medium text-primary">
            {t("dates.updating")}
          </span>
        )}
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t("dates.tripTimeframe")}
      >
        {PRESET_META.map((p) => {
          const active = draft.preset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => selectPreset(p.value)}
              aria-pressed={active}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 active:scale-95 motion-reduce:transform-none",
                active
                  ? "border-primary-fixed bg-primary text-on-primary shadow-md shadow-primary/25"
                  : "border-outline-variant/30 bg-surface text-on-surface hover:bg-surface-container-low",
              )}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                {p.icon}
              </span>
              {t(p.labelKey)}
            </button>
          );
        })}
      </div>

      {customOpen && (
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-outline-variant/20 pt-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block text-xs font-medium text-on-surface-variant">
            {t("dates.start")}
            <input
              type="date"
              min={min}
              max={max}
              value={draft.startDate}
              className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onChange={(e) => {
                const startDate = e.target.value;
                const next = resolveDateWindow({
                  preset: "custom",
                  startDate,
                  endDate:
                    draft.endDate < startDate ? startDate : draft.endDate,
                  locale,
                });
                applyWindow(next);
              }}
            />
          </label>
          <label className="block text-xs font-medium text-on-surface-variant">
            {t("dates.end")}
            <input
              type="date"
              min={draft.startDate || min}
              max={max}
              value={draft.endDate}
              className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onChange={(e) => {
                applyWindow(
                  resolveDateWindow({
                    preset: "custom",
                    startDate: draft.startDate,
                    endDate: e.target.value,
                    locale,
                  }),
                );
              }}
            />
          </label>
          <div className="flex items-end">
            <p className="w-full rounded-lg bg-primary/5 px-3 py-2.5 text-center text-sm font-medium text-primary">
              {draft.rangeLabel}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
