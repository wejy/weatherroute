"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  maxForecastDateKey,
  minForecastDateKey,
  resolveDateWindow,
  type DatePreset,
  type DateWindow,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";

const PRESET_ICONS: Record<DatePreset, string> = {
  today: "today",
  tomorrow: "event",
  weekend: "date_range",
  custom: "edit_calendar",
};

export function DateWhenField({
  value,
  onChange,
}: {
  value: DateWindow;
  onChange: (next: DateWindow) => void;
}) {
  const { t, locale } = useI18n();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const min = useMemo(() => minForecastDateKey(), []);
  const max = useMemo(() => maxForecastDateKey(), []);

  const presets: { value: DatePreset; label: string }[] = [
    { value: "today", label: t("dates.today") },
    { value: "tomorrow", label: t("dates.tomorrow") },
    { value: "weekend", label: t("dates.weekend") },
    { value: "custom", label: t("dates.pickDate") },
  ];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function selectPreset(preset: DatePreset) {
    if (preset === "custom") {
      const base = resolveDateWindow({
        preset: "custom",
        startDate: value.startDate || min,
        endDate: value.endDate || value.startDate || min,
        locale,
      });
      onChange(base);
      setOpen(true);
      return;
    }
    onChange(resolveDateWindow({ preset, locale }));
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative w-full text-left">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="material-symbols-outlined text-xl text-secondary">
          calendar_month
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xl font-semibold text-on-surface">
            {value.preset === "custom" ? value.rangeLabel : value.label}
          </span>
          {value.preset !== "custom" && (
            <span className="block truncate text-xs text-on-surface-variant">
              {value.rangeLabel}
            </span>
          )}
        </span>
        <span className="material-symbols-outlined text-outline">
          expand_more
        </span>
      </button>

      {open && (
        <div
          id={listId}
          className="absolute top-full left-0 z-50 mt-3 w-[min(100vw-2rem,18rem)] rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 shadow-[0px_10px_30px_rgba(0,0,0,0.12)]"
        >
          <ul className="flex flex-col">
            {presets.map((p) => {
              const active = value.preset === p.value;
              return (
                <li key={p.value}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base transition-colors hover:bg-surface-container-low",
                      active && "bg-primary/5 font-semibold text-primary",
                    )}
                    onClick={() => selectPreset(p.value)}
                  >
                    <span className="material-symbols-outlined text-secondary">
                      {PRESET_ICONS[p.value]}
                    </span>
                    {p.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {value.preset === "custom" && (
            <div className="mt-2 space-y-2 border-t border-outline-variant/20 px-2 pt-3 pb-1">
              <label className="block text-xs font-medium text-on-surface-variant">
                {t("dates.start")}
                <input
                  type="date"
                  min={min}
                  max={max}
                  value={value.startDate}
                  className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  onChange={(e) => {
                    const startDate = e.target.value;
                    onChange(
                      resolveDateWindow({
                        preset: "custom",
                        startDate,
                        endDate:
                          value.endDate < startDate ? startDate : value.endDate,
                        locale,
                      }),
                    );
                  }}
                />
              </label>
              <label className="block text-xs font-medium text-on-surface-variant">
                {t("dates.end")}
                <input
                  type="date"
                  min={value.startDate || min}
                  max={max}
                  value={value.endDate}
                  className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  onChange={(e) => {
                    onChange(
                      resolveDateWindow({
                        preset: "custom",
                        startDate: value.startDate,
                        endDate: e.target.value,
                        locale,
                      }),
                    );
                  }}
                />
              </label>
              <button
                type="button"
                className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-on-primary"
                onClick={() => setOpen(false)}
              >
                {t("dates.apply")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
