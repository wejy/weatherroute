import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { WEATHER_TONE_COLORS } from "@/lib/weather-tone";

/**
 * Solid fill matching Map’s quiet/neutral pin border (not Routes green clear).
 * `MARKER_NEUTRAL_BORDER` is too transparent as a filled swatch.
 */
const LEGEND_CLEAR_SWATCH =
  "color-mix(in srgb, var(--outline-variant) 85%, var(--on-surface) 15%)";

/**
 * Compact legend under the map origin chip — explains Map pin borders + ! badge.
 */
export async function MapConditionsLegend() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));

  const rows: Array<{
    key: string;
    label: string;
    swatch: "dot" | "alert";
    color?: string;
  }> = [
    {
      key: "clear",
      label: t("map.legendClear"),
      swatch: "dot",
      color: LEGEND_CLEAR_SWATCH,
    },
    {
      key: "caution",
      label: t("map.legendCaution"),
      swatch: "dot",
      color: WEATHER_TONE_COLORS.caution,
    },
    {
      key: "rain",
      label: t("map.legendRain"),
      swatch: "dot",
      color: WEATHER_TONE_COLORS.warning,
    },
    {
      key: "alert",
      label: t("map.legendAlert"),
      swatch: "alert",
    },
  ];

  return (
    <div
      className="w-full rounded-xl border border-outline-variant/25 bg-surface/95 px-3 py-2.5 shadow-[0px_8px_24px_rgba(0,0,0,0.1)] backdrop-blur-xl"
      aria-label={t("map.conditions")}
    >
      <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">
        {t("map.conditions")}
      </p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            {row.swatch === "alert" ? (
              <span
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-secondary text-[8px] font-bold leading-none text-on-secondary"
                aria-hidden="true"
              >
                !
              </span>
            ) : (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-surface shadow-sm"
                style={{ backgroundColor: row.color }}
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 text-xs leading-tight text-on-surface">
              {row.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
