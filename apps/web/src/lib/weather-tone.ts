import type { WeatherCondition, WeatherTone } from "@/lib/types";

export type { WeatherTone };

/** Map / route chrome: rain reads as blue, not alarm red. */
export const WEATHER_TONE_COLORS: Record<WeatherTone, string> = {
  clear: "#4edea3",
  caution: "#f59e0b",
  /** Heavy rain / wet corridor — secondary blue, not error. */
  warning: "#006591",
};

/** Storm / severe alert accent (advisories + storm markers only). */
export const SEVERE_ALERT_COLOR = "#ba1a1a";

/**
 * Classify corridor / map weather for the conditions legend.
 * Storm and heavy rain → "warning" (map chrome uses blue for rain; storm can override to red).
 */
export function weatherTone(
  rainProbability: number,
  condition: WeatherCondition,
): WeatherTone {
  if (condition === "storm" || rainProbability >= 50) return "warning";
  if (
    condition === "rainy" ||
    condition === "snow" ||
    condition === "fog" ||
    rainProbability >= 30
  ) {
    return "caution";
  }
  return "clear";
}

export function worseTone(a: WeatherTone, b: WeatherTone): WeatherTone {
  const rank = { clear: 0, caution: 1, warning: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
}

/** True when the point should use alarm red on the map (storm), not rain blue. */
export function isSevereMapAlert(
  condition: WeatherCondition,
  advisories?: Array<{ id: string }>,
): boolean {
  if (condition === "storm") return true;
  return Boolean(advisories?.some((a) => a.id === "storm"));
}

/** Border / line color for a map marker or route segment. */
export function mapWeatherColor(
  tone: WeatherTone,
  condition: WeatherCondition,
  advisories?: Array<{ id: string }>,
): string {
  if (isSevereMapAlert(condition, advisories)) return SEVERE_ALERT_COLOR;
  return WEATHER_TONE_COLORS[tone];
}
