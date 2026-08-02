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
  mode?: string;
};

const DESKTOP_MQ = "(min-width: 1024px)";

export function MapFloatingFilters({
  defaults,
  weatherGoal,
  tier = "anon",
  className,
}: {
  defaults: Defaults;
  weatherGoal: string;
  tier?: "anon" | "free" | "pro";
  className?: string;
}) {
  const { t } = useI18n();
  // Mobile-first: start collapsed so the map stays usable.
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => {
      const desktop = mq.matches;
      setIsDesktop(desktop);
      setOpen(desktop);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  useEffect(() => {
    if (!open || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isDesktop]);

  return (
    <>
      {!open ? (
        <div className={cn("pointer-events-auto", className)}>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls={panelId}
            aria-haspopup="dialog"
            className="flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/25 bg-surface/95 px-4 py-2.5 text-sm font-semibold text-on-surface shadow-[0px_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-surface motion-reduce:transform-none"
          >
            <span
              className="material-symbols-outlined text-primary"
              aria-hidden="true"
            >
              tune
            </span>
            {t("map.filterWeather")}
          </button>
        </div>
      ) : null}

      {!isDesktop && open ? (
        <button
          type="button"
          className="pointer-events-auto fixed inset-0 z-30 bg-inverse-surface/45 backdrop-blur-[2px] lg:hidden"
          aria-label={t("map.hideFilters")}
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Panel stays mounted (hidden when closed) so aria-controls never breaks. */}
      <div
        id={panelId}
        role={open ? "dialog" : undefined}
        aria-modal={open && !isDesktop ? true : undefined}
        aria-label={t("map.filterWeather")}
        hidden={!open}
        inert={!open ? true : undefined}
        className={cn(
          "pointer-events-auto z-40 flex flex-col overflow-hidden border border-outline-variant/25 bg-surface/98 shadow-[0px_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl",
          "fixed inset-x-0 bottom-[4.75rem] max-h-[min(68vh,28rem)] w-full rounded-t-2xl border-b-0",
          "lg:relative lg:inset-auto lg:bottom-auto lg:max-h-[min(78vh,40rem)] lg:w-[min(100%,22.5rem)] lg:rounded-2xl lg:border-b lg:shadow-[0px_10px_30px_rgba(0,0,0,0.12)]",
          !open && "hidden",
          open && className,
        )}
      >
        <div className="flex shrink-0 flex-col border-b border-outline-variant/20">
          <div
            className="flex justify-center pt-2 lg:hidden"
            aria-hidden="true"
          >
            <span className="h-1 w-10 rounded-full bg-outline-variant/60" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="material-symbols-outlined text-primary"
                aria-hidden="true"
              >
                tune
              </span>
              <h2 className="truncate text-sm font-semibold text-on-surface">
                {t("map.filterWeather")}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
              aria-label={t("map.hideFilters")}
              title={t("map.hideFilters")}
            >
              <span
                className="material-symbols-outlined text-xl"
                aria-hidden="true"
              >
                close
              </span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
          <DiscoverSearch
            defaults={defaults}
            tier={tier}
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
    </>
  );
}
