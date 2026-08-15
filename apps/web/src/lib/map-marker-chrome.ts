/**
 * Mapbox marker HTML uses inline styles; CSS variables resolve under
 * documentElement[data-theme], so chips track light/dark without hardcoding.
 */

import {
  SEVERE_ALERT_COLOR,
  WEATHER_TONE_COLORS,
} from "@/lib/weather-tone";
import type { WeatherTone } from "@/lib/types";

const FONT =
  "600 12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif";

/** Quiet border when the pin is neither selected nor alerting. */
export const MARKER_NEUTRAL_BORDER = "color-mix(in srgb, var(--outline-variant) 70%, transparent)";

export function escapeMarkerHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Label under map pins: `1. Tampere` when ranked. */
export function rankedMarkerLabel(name: string, rank?: number): string {
  return rank != null ? `${rank}. ${name}` : name;
}

export function originDotHtml(): string {
  return `<div style="background:var(--primary);color:var(--on-primary);border-radius:999px;padding:8px 12px;font:${FONT};box-shadow:0 4px 14px rgba(0,0,0,.18);border:2px solid var(--surface);">●</div>`;
}

export function weatherMarkerToneBorder(opts: {
  tone: WeatherTone;
  severe: boolean;
  selected: boolean;
}): string {
  if (opts.severe) return SEVERE_ALERT_COLOR;
  if (opts.tone === "warning") return WEATHER_TONE_COLORS.warning;
  if (opts.tone === "caution") return WEATHER_TONE_COLORS.caution;
  if (opts.selected) return "var(--primary)";
  return MARKER_NEUTRAL_BORDER;
}

export function markerWarnDotHtml(opts: {
  severe: boolean;
  tone: WeatherTone;
}): string {
  const bg = opts.severe
    ? SEVERE_ALERT_COLOR
    : opts.tone === "warning"
      ? WEATHER_TONE_COLORS.warning
      : WEATHER_TONE_COLORS.caution;
  return `<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:999px;background:${bg};border:2px solid var(--surface);" aria-hidden="true"></span>`;
}

export function markerChipHtml(opts: {
  tempLabel: string;
  toneBorder: string;
  warnDotHtml?: string;
}): string {
  return `<div style="position:relative;display:flex;align-items:center;gap:4px;background:var(--surface);border-radius:999px;padding:6px 10px;font:${FONT};box-shadow:0 4px 14px rgba(0,0,0,.12);border:2px solid ${opts.toneBorder};color:var(--on-surface);">
      <span>${opts.tempLabel}</span>
      ${opts.warnDotHtml ?? ""}
    </div>`;
}

export function routeWaypointChipHtml(opts: {
  tempLabel: string;
  rainPct: number;
  toneBorder: string;
  warnBadgeHtml: string;
  nameHtml: string;
  selected: boolean;
}): string {
  const scale = opts.selected ? "scale(1.08)" : "none";
  return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;transform:${scale};">
    <div style="position:relative;display:flex;align-items:center;gap:6px;background:var(--surface);border-radius:14px;padding:8px 10px;font:600 12px/1.1 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.14);border:2px solid ${opts.toneBorder};color:var(--on-surface);white-space:nowrap;">
      <span style="font-size:15px;font-variant-numeric:tabular-nums;">${opts.tempLabel}</span>
      <span style="width:1px;height:14px;background:color-mix(in srgb, var(--on-surface) 12%, transparent);"></span>
      <span style="font-size:10px;font-weight:600;color:var(--on-surface-variant);">${opts.rainPct}%</span>
      ${opts.warnBadgeHtml}
    </div>
    <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;font:600 10px/1.2 system-ui,sans-serif;color:var(--on-surface-variant);background:var(--surface-container-lowest);padding:2px 6px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.08);">${opts.nameHtml}</span>
  </div>`;
}

export function routeWarnBadgeHtml(badgeColor: string): string {
  return `<span style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:999px;background:${badgeColor};border:2px solid var(--surface);display:flex;align-items:center;justify-content:center;font:700 9px/1 system-ui,sans-serif;color:#fff;" aria-hidden="true">!</span>`;
}
