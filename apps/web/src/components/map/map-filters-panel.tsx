"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DiscoverSearch } from "@/components/discover/search-island";
import { WeatherFilters } from "@/components/discover/weather-filters";
import { useI18n } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

type Defaults = {
  origin?: string;
  distance?: string;
  radiusKm?: number;
  weatherGoal?: string;
  lat?: number;
  lon?: number;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
};

export function MapFloatingFilters({
  defaults,
  weatherGoal,
  className,
}: {
  defaults: Defaults;
  weatherGoal: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (wasOpen.current && !open) {
      toggleRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) {
    return (
      <div className={cn("pointer-events-auto", className)}>
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={panelId}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-outline-variant/25 bg-surface/95 px-4 py-3 text-sm font-semibold text-on-surface shadow-[0px_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-surface motion-reduce:transform-none"
        >
          <span className="material-symbols-outlined text-primary" aria-hidden="true">
            tune
          </span>
          {t("map.filterWeather")}
          <span className="material-symbols-outlined text-outline text-lg" aria-hidden="true">
            expand_more
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      id={panelId}
      role="region"
      aria-label={t("map.filterWeather")}
      className={cn(
        "pointer-events-auto flex max-h-[min(78vh,40rem)] w-[min(100%,22.5rem)] flex-col overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface/95 shadow-[0px_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">
            tune
          </span>
          <h2 className="text-sm font-semibold text-on-surface">
            {t("map.filterWeather")}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          aria-label={t("map.hideFilters")}
          title={t("map.hideFilters")}
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            close
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <DiscoverSearch
          defaults={defaults}
          basePath="/map"
          hash=""
          variant="stack"
          showGoalField={false}
        />
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-on-surface-variant uppercase">
            {t("search.weatherGoal")}
          </p>
          <WeatherFilters
            active={weatherGoal}
            basePath="/map"
            showMapLink={false}
            compact
          />
        </div>
      </div>
    </div>
  );
}
