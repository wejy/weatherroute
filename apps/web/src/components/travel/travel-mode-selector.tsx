"use client";

import { useRef } from "react";
import {
  DEFAULT_TRAVEL_MODE,
  TRAVEL_MODES,
  travelModeIcon,
  type TravelMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { radiogroupNavIndex } from "@/lib/radiogroup-keyboard";
import { useI18n } from "@/components/i18n/locale-provider";

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
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = TRAVEL_MODES.indexOf(mode);
    const nextIndex = radiogroupNavIndex(
      e.key,
      currentIndex < 0 ? 0 : currentIndex,
      TRAVEL_MODES.length,
    );
    if (nextIndex == null) return;
    e.preventDefault();
    const next = TRAVEL_MODES[nextIndex]!;
    onChange(next);
    queueMicrotask(() => buttonRefs.current[nextIndex]?.focus());
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("travel.modeLabel")}
      onKeyDown={onKeyDown}
      className={cn(
        "flex rounded-lg border border-outline-variant/30 bg-surface p-1",
        className,
      )}
    >
      {TRAVEL_MODES.map((m, i) => {
        const selected = mode === m;
        return (
          <button
            key={m}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
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
              {travelModeIcon(m)}
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
