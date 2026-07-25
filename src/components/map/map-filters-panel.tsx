"use client";

import { useState } from "react";
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

  if (!open) {
    return (
      <div className={cn("pointer-events-auto", className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface/95 px-4 py-3 text-sm font-semibold text-on-surface shadow-[0px_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-surface"
        >
          <span className="material-symbols-outlined text-primary">tune</span>
          {t("map.filterWeather")}
          <span className="material-symbols-outlined text-outline text-lg">
            expand_more
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex max-h-[min(78vh,40rem)] w-[min(100%,22.5rem)] flex-col overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface/95 shadow-[0px_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">tune</span>
          <h2 className="text-sm font-semibold text-on-surface">
            {t("map.filterWeather")}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          aria-label={t("map.hideFilters")}
          title={t("map.hideFilters")}
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <DiscoverSearch
          defaults={defaults}
          basePath="/map"
          hash=""
          variant="stack"
          autoDetect
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
