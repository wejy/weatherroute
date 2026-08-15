"use client";

import { useEffect, useId, useState } from "react";
import { useI18n } from "@/components/i18n/locale-provider";
import { WEATHER_TONE_COLORS } from "@/lib/weather-tone";
import { cn } from "@/lib/utils";

const DESKTOP_MQ = "(min-width: 768px)";

/**
 * Route map conditions legend. Collapsed by default on mobile so it
 * doesn’t cover the map; always expanded from `md` up.
 */
export function RouteConditionsLegend({ className }: { className?: string }) {
  const { t } = useI18n();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

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

  const expanded = isDesktop || open;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-2.5 right-3 z-10 sm:right-14",
        className,
      )}
    >
      {!expanded ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={panelId}
          className="flex min-h-10 items-center gap-2 rounded-full border border-outline-variant/30 bg-surface/95 px-3 py-2 text-xs font-semibold text-on-surface shadow-[0px_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors hover:bg-surface"
        >
          <span className="flex items-center gap-1" aria-hidden="true">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: WEATHER_TONE_COLORS.clear }}
            />
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: WEATHER_TONE_COLORS.caution }}
            />
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: WEATHER_TONE_COLORS.warning }}
            />
          </span>
          {t("routes.showConditions")}
        </button>
      ) : (
        <div
          id={panelId}
          className="rounded-xl border border-outline-variant/20 bg-surface/95 p-3 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md md:p-4"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="m-0 text-xs font-medium tracking-wider text-on-surface-variant uppercase md:text-sm">
              {t("routes.conditions")}
            </h2>
            {!isDesktop ? (
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("routes.hideConditions")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  aria-hidden="true"
                >
                  close
                </span>
              </button>
            ) : null}
          </div>
          <ul className="flex flex-col gap-1.5 md:gap-2">
            <li className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full md:h-3 md:w-3"
                style={{ backgroundColor: WEATHER_TONE_COLORS.clear }}
                aria-hidden="true"
              />
              <span className="text-sm text-on-surface md:text-base">
                {t("routes.clearRoute")}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full md:h-3 md:w-3"
                style={{ backgroundColor: WEATHER_TONE_COLORS.caution }}
                aria-hidden="true"
              />
              <span className="text-sm text-on-surface md:text-base">
                {t("routes.cloudyCaution")}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full md:h-3 md:w-3"
                style={{ backgroundColor: WEATHER_TONE_COLORS.warning }}
                aria-hidden="true"
              />
              <span className="text-sm text-on-surface md:text-base">
                {t("routes.rainWarning")}
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
