"use client";

import Link from "next/link";
import type { DestinationDto } from "@/lib/types";
import { travelModeIcon } from "@/lib/types";
import { cn, formatTemp } from "@/lib/utils";
import { formatDistanceKm } from "@/lib/distance";
import {
  temperatureColor,
  temperatureLabelColor,
} from "@/lib/temp-color";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { useI18n } from "@/components/i18n/locale-provider";
import { useResolvedTheme } from "@/components/theme/theme-provider";
import { translateCondition } from "@/i18n/translate";

/** Compact 7-day max-temp bars colored by absolute °C scale. */
export function TempSparkline({
  values,
  labels,
  className,
  height = 56,
}: {
  values: number[];
  /** Weekday short labels under each bar (same length as values when provided). */
  labels?: string[];
  className?: string;
  height?: number;
}) {
  const theme = useResolvedTheme();
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const showLabels = Boolean(labels && labels.length === values.length);
  const barMax = Math.max(height - (showLabels ? 28 : 18), 20);

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
        const ink = temperatureLabelColor(v, theme);
        const day = labels?.[i] ? formatSparkDayLabel(labels[i]!) : null;
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
            {day ? (
              <span className="text-[9px] leading-none font-medium text-on-surface-variant">
                {day}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Capitalize weekday short for bar labels (fi: ma → Ma). */
function formatSparkDayLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1);
}

/** Inline HTML for Mapbox popups (no React). */
export function tempSeriesBarsHtml(
  series: number[],
  labels?: string[],
  theme: "light" | "dark" = "light",
): string {
  if (series.length < 2) return "";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(max - min, 1);
  const showLabels = Boolean(labels && labels.length === series.length);
  const dayColor = theme === "dark" ? "#9aa0a6" : "#5f6368";
  const bars = series
    .map((v, i) => {
      const h = 10 + ((v - min) / span) * (showLabels ? 28 : 36);
      const fill = temperatureColor(v);
      const ink = temperatureLabelColor(v, theme);
      const day = labels?.[i] ? formatSparkDayLabel(labels[i]!) : "";
      const dayHtml = day
        ? `<span style="font-size:9px;font-weight:500;color:${dayColor};line-height:1">${day}</span>`
        : "";
      return `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;height:100%">
        <span style="font-size:10px;font-weight:600;color:${ink};line-height:1">${Math.round(v)}°</span>
        <div style="width:100%;max-width:16px;height:${h}px;background:${fill};border-radius:3px 3px 0 0"></div>
        ${dayHtml}
      </div>`;
    })
    .join("");
  return `<div style="display:flex;align-items:flex-end;gap:3px;height:${showLabels ? 70 : 58}px;margin-top:4px;width:100%">${bars}</div>`;
}

export function MapNearbyCard({
  destination,
  href,
  routeHref,
  rank,
  compact = false,
}: {
  destination: DestinationDto;
  href: string;
  /** Per-card route planner link (below weather details). */
  routeHref?: string;
  /** 1-based recommendation rank. */
  rank?: number;
  compact?: boolean;
}) {
  const { t, dict, locale } = useI18n();
  const d = destination;
  const duration = d.driveDurationLabel ?? "";
  const series = d.tempSeries ?? [];
  const dayLabels = d.tempDayLabels;
  const modeIcon = travelModeIcon(d.travelMode);
  const title =
    rank != null
      ? t("map.rankedName", { rank, name: d.name })
      : d.name;

  return (
    <article
      className={cn(
        "rounded-xl border border-surface-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-colors",
        compact ? "min-w-[200px] max-w-[220px] shrink-0 p-3" : "p-4",
      )}
    >
      <Link
        href={href}
        className="group block cursor-pointer rounded-lg outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3
            className={cn(
              "m-0 font-semibold text-on-surface transition-colors group-hover:text-primary",
              compact ? "text-base" : "text-xl",
            )}
          >
            {title}
          </h3>
          <span
            className={`material-symbols-outlined fill-icon shrink-0 ${weatherIconClass(d.condition)}`}
            aria-hidden="true"
          >
            {weatherIcon(d.condition)}
          </span>
        </div>
        <p className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-on-surface-variant">
          <span>{formatDistanceKm(d.distanceKm, locale)}</span>
          {duration ? (
            <span className="inline-flex items-center gap-0.5">
              <span aria-hidden="true">·</span>
              <span
                className="material-symbols-outlined text-[16px]"
                aria-hidden="true"
              >
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
            <TempSparkline
              values={series}
              labels={dayLabels}
              height={compact ? 60 : 68}
            />
          </div>
        )}

        {!compact && (
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
        )}
      </Link>

      {routeHref && !compact ? (
        <Link
          href={routeHref}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-semibold text-on-accent shadow-sm transition-colors hover:bg-accent-container hover:text-on-accent-container"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            route
          </span>
          {t("map.generateRoute")}
        </Link>
      ) : null}
    </article>
  );
}
