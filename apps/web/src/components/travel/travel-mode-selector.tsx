"use client";

import {
  DEFAULT_TRAVEL_MODE,
  TRAVEL_MODES,
  type TravelMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";

const MODE_ICONS: Record<TravelMode, string> = {
  driving: "directions_car",
  cycling: "directions_bike",
};

export function TravelModeSelector({
  value,
  onChange,
  className,
  size = "md",
}: {
  value: TravelMode;
  onChange: (mode: TravelMode) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  const mode = value || DEFAULT_TRAVEL_MODE;

  return (
    <div
      role="radiogroup"
      aria-label={t("travel.modeLabel")}
      className={cn(
        "flex rounded-lg border border-outline-variant/30 bg-surface p-1",
        className,
      )}
    >
      {TRAVEL_MODES.map((m) => {
        const selected = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m)}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md font-semibold transition-colors",
              size === "sm" ? "px-2 py-1.5 text-sm" : "px-3 py-2 text-sm",
              selected
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
            )}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {MODE_ICONS[m]}
            </span>
            <span>
              {m === "driving" ? t("travel.driving") : t("travel.cycling")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
