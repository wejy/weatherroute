"use client";

import Link from "next/link";
import type { DestinationDto } from "@/lib/types";
import { travelModeIcon } from "@/lib/types";
import { cn, formatTemp } from "@/lib/utils";
import {
  temperatureColor,
  temperatureInkColor,
} from "@/lib/temp-color";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { useI18n } from "@/components/i18n/locale-provider";
import { translateCondition } from "@/i18n/translate";

/** Compact 7-day max-temp bars colored by absolute °C scale. */
export function TempSparkline({
  values,
  className,
  height = 56,
}: {
  values: number[];
  className?: string;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const barMax = Math.max(height - 18, 24);

  return (
    <div
      className={cn("flex w-full items-end gap-1", className)}
      style={{ height }}
      role="img"
      aria-label={`Temperatures ${formatTemp(min)} to ${formatTemp(max)}`}
    >
      {values.map((v, i) => {
        const h = 10 + ((v - min) / span) * (barMax - 10);
        const fill = temperatureColor(v);
        const ink = temperatureInkColor(v);
        return (
          <div
            key={i}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5"
            style={{ height: "100%" }}
          >
            <span
              className="text-[10px] leading-none font-semibold"
              style={{ color: ink }}
            >
              {Math.round(v)}°
            </span>
            <div
              className="w-full max-w-[18px] rounded-t-sm"
              style={{ height: h, backgroundColor: fill }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Inline HTML for Mapbox popups (no React). */
export function tempSeriesBarsHtml(series: number[]): string {
  if (series.length < 2) return "";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(max - min, 1);
  const bars = series
    .map((v) => {
      const h = 10 + ((v - min) / span) * 36;
      const fill = temperatureColor(v);
      const ink = temperatureInkColor(v);
      return `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;height:100%">
        <span style="font-size:10px;font-weight:600;color:${ink};line-height:1">${Math.round(v)}°</span>
        <div style="width:100%;max-width:16px;height:${h}px;background:${fill};border-radius:3px 3px 0 0"></div>
      </div>`;
    })
    .join("");
  return `<div style="display:flex;align-items:flex-end;gap:3px;height:58px;margin-top:4px;width:100%">${bars}</div>`;
}

export function MapNearbyCard({
  destination,
  href,
  compact = false,
}: {
  destination: DestinationDto;
  href: string;
  compact?: boolean;
}) {
  const { t, dict } = useI18n();
  const d = destination;
  const duration = d.driveDurationLabel ?? "";
  const series = d.tempSeries ?? [];
  const modeIcon = travelModeIcon(d.travelMode);

  return (
    <Link
      href={href}
      className={cn(
        "group relative block cursor-pointer rounded-xl border border-surface-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-colors hover:border-primary/50 focus-visible:border-primary/50",
        compact ? "min-w-[240px] p-3" : "p-4",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3
          className={cn(
            "m-0 font-semibold text-on-surface",
            compact ? "text-base" : "text-xl",
          )}
        >
          {d.name}
        </h3>
        <span
          className={`material-symbols-outlined fill-icon shrink-0 ${weatherIconClass(d.condition)}`}
          aria-hidden="true"
        >
          {weatherIcon(d.condition)}
        </span>
      </div>
      <p className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-on-surface-variant">
        <span>{Math.round(d.distanceKm)} km</span>
        {duration ? (
          <span className="inline-flex items-center gap-0.5">
            <span aria-hidden="true">·</span>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {modeIcon}
            </span>
            ~{duration}
          </span>
        ) : null}
        <span>· {formatTemp(d.temperatureC)}C</span>
      </p>
      {!compact && (
        <div className="mb-2 flex flex-col gap-1">
          <span className="rounded-full bg-surface-container px-2 py-1 text-sm text-secondary">
            {t("map.rainProbability", { pct: d.rainProbability })}
          </span>
          {d.precipitationMm != null && (
            <span className="rounded-full bg-surface-container px-2 py-1 text-sm text-on-surface-variant">
              {t("map.rainAmount", { mm: d.precipitationMm })}
            </span>
          )}
        </div>
      )}

      {series.length >= 2 && (
        <div className="mt-2 rounded-lg border border-outline-variant/25 bg-surface-container/60 px-2 py-2">
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
            {t("map.hoverTempChart")}
          </p>
          <TempSparkline values={series} height={compact ? 48 : 56} />
        </div>
      )}

      {!compact && (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            "grid-rows-[0fr] opacity-0",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:grid-rows-[1fr]",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100",
            "[@media(hover:hover)_and_(pointer:fine)]:group-focus-visible:grid-rows-[1fr]",
            "[@media(hover:hover)_and_(pointer:fine)]:group-focus-visible:opacity-100",
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-3 border-t border-outline-variant/20 pt-3">
              <p className="text-sm text-on-surface">
                {t("map.hoverNow", {
                  temp: formatTemp(d.current.temperatureC),
                })}
              </p>
              <p className="text-sm font-semibold text-on-surface">
                {t("map.hoverForecast", {
                  label: d.forecast.rangeLabel || t("card.forecast"),
                  min: formatTemp(d.forecast.tempMinC),
                  max: formatTemp(d.forecast.tempMaxC),
                })}
              </p>
              <p className="text-xs text-on-surface-variant">
                {translateCondition(dict, d.forecast.condition)}
              </p>
              <p className="mt-2 text-xs text-on-surface-variant">
                {t("map.hoverRain", { pct: d.rainProbability })}
                {d.precipitationMm != null
                  ? ` · ${t("map.hoverRainMm", { mm: d.precipitationMm })}`
                  : ""}
              </p>
              <p className="text-xs text-on-surface-variant">
                {t("map.hoverSun", { score: d.sunshineScore })}
              </p>
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
