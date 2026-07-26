"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";
import { DiscoverQueryLink } from "@/components/discover/discover-query-link";

const FILTERS = [
  { value: "best", key: "best", icon: "auto_awesome" },
  { value: "sun", key: "sun", icon: "wb_sunny" },
  { value: "dry", key: "dry", icon: "water_drop" },
  { value: "mild", key: "mild", icon: "device_thermostat" },
  { value: "rain", key: "rain", icon: "rainy" },
  { value: "warm", key: "warm", icon: "thermostat" },
] as const;

export function WeatherFilters({
  active,
  basePath = "/",
  showMapLink = true,
  className,
  compact = false,
}: {
  active: string;
  basePath?: string;
  showMapLink?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("weatherGoal", value);
    const hash = basePath === "/" ? "#results" : "";
    router.push(`${basePath}?${params.toString()}${hash}`);
  }

  return (
    <div
      className={cn(
        "relative z-30 flex flex-wrap gap-2",
        compact ? "justify-start" : "mb-10 justify-center gap-3",
        className,
      )}
    >
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => select(f.value)}
            aria-pressed={isActive}
            className={cn(
              "relative flex min-h-11 items-center gap-2 rounded-full border font-medium shadow-sm transition-all hover:-translate-y-0.5 motion-reduce:transform-none",
              compact ? "px-3 py-2 text-xs" : "px-5 py-2.5 text-sm",
              isActive
                ? "border-accent-fixed bg-accent text-on-accent shadow-lg shadow-accent/30"
                : "border-outline-variant/30 bg-surface/95 text-on-surface shadow-[0px_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl hover:bg-surface",
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined",
                compact ? "text-base" : "text-xl",
                isActive && "fill-icon",
                !isActive && f.value === "best" && "text-primary",
                !isActive && f.value === "sun" && "text-amber-500",
                !isActive && f.value === "dry" && "text-secondary",
                !isActive && f.value === "mild" && "text-tertiary",
                !isActive && f.value === "rain" && "text-secondary",
                !isActive && f.value === "warm" && "text-error",
              )}
              aria-hidden="true"
            >
              {f.icon}
            </span>
            <span>{t(`filters.${f.key}`)}</span>
          </button>
        );
      })}
      {showMapLink && (
        <DiscoverQueryLink
          href="/map"
          className={cn(
            "relative flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface/95 font-medium text-on-surface shadow-[0px_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-surface",
            compact ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
          )}
        >
          <span
            className={cn(
              "material-symbols-outlined text-primary",
              compact ? "text-base" : "text-xl",
            )}
            aria-hidden="true"
          >
            map
          </span>
          {t("filters.map")}
        </DiscoverQueryLink>
      )}
    </div>
  );
}
