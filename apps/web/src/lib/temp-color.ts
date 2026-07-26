/**
 * Meteorological-style temperature color scale (°C).
 * White (extreme cold) → blue → yellow → red (extreme heat), −40…+50.
 */

export const TEMP_SCALE_MIN_C = -40;
export const TEMP_SCALE_MAX_C = 50;

type Rgb = readonly [number, number, number];

/** Keyframe stops along the absolute temperature axis. */
const STOPS: ReadonlyArray<{ t: number; rgb: Rgb }> = [
  { t: -40, rgb: [255, 255, 255] }, // white
  { t: -25, rgb: [190, 220, 255] }, // pale ice blue
  { t: -10, rgb: [80, 140, 230] }, // blue
  { t: 0, rgb: [37, 99, 235] }, // strong blue
  { t: 10, rgb: [56, 189, 248] }, // cyan-blue
  { t: 18, rgb: [250, 204, 21] }, // yellow
  { t: 28, rgb: [251, 146, 60] }, // orange
  { t: 38, rgb: [239, 68, 68] }, // red
  { t: 50, rgb: [127, 29, 29] }, // deep red
];

function clampTemp(celsius: number): number {
  return Math.min(TEMP_SCALE_MAX_C, Math.max(TEMP_SCALE_MIN_C, celsius));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function temperatureColorRgb(celsius: number): Rgb {
  const t = clampTemp(celsius);
  if (t <= STOPS[0]!.t) return STOPS[0]!.rgb;
  if (t >= STOPS[STOPS.length - 1]!.t) return STOPS[STOPS.length - 1]!.rgb;

  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i]!;
    const b = STOPS[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      return lerpRgb(a.rgb, b.rgb, u);
    }
  }
  return STOPS[STOPS.length - 1]!.rgb;
}

/** Hex color for a temperature in °C. */
export function temperatureColor(celsius: number): string {
  return rgbToHex(temperatureColorRgb(celsius));
}

/** Darker/ink color for labels on light bars (yellow/white). */
export function temperatureInkColor(celsius: number): string {
  const [r, g, b] = temperatureColorRgb(celsius);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance > 0.62) {
    return rgbToHex([
      Math.round(r * 0.35),
      Math.round(g * 0.35),
      Math.round(b * 0.45),
    ]);
  }
  return rgbToHex([r, g, b]);
}

/** Horizontal CSS gradient for the full −40…+50 scale legend. */
export function temperatureScaleCssGradient(): string {
  const parts = STOPS.map((s) => {
    const pct =
      ((s.t - TEMP_SCALE_MIN_C) / (TEMP_SCALE_MAX_C - TEMP_SCALE_MIN_C)) * 100;
    return `${rgbToHex(s.rgb)} ${pct.toFixed(1)}%`;
  });
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

/** Recharts / SVG gradient stops along a series (x-axis = days). */
export function temperatureSeriesGradientStops(
  temps: number[],
): Array<{ offset: string; color: string }> {
  if (temps.length === 0) {
    return [
      { offset: "0%", color: temperatureColor(0) },
      { offset: "100%", color: temperatureColor(0) },
    ];
  }
  if (temps.length === 1) {
    const c = temperatureColor(temps[0]!);
    return [
      { offset: "0%", color: c },
      { offset: "100%", color: c },
    ];
  }
  return temps.map((temp, i) => ({
    offset: `${((i / (temps.length - 1)) * 100).toFixed(2)}%`,
    color: temperatureColor(temp),
  }));
}
