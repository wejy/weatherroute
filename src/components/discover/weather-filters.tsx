"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";

const FILTERS = [
  { value: "sun", key: "sun", icon: "wb_sunny", filled: true },
  { value: "dry", key: "dry", icon: "water_drop" },
  { value: "warm", key: "warm", icon: "thermostat" },
  { value: "calm", key: "calm", icon: "air" },
  { value: "cloudy", key: "cloudy", icon: "cloud" },
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
            className={cn(
              "relative flex items-center gap-2 rounded-full border font-medium shadow-sm transition-all hover:-translate-y-0.5 active:scale-95",
              compact ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
              isActive
                ? "border-primary-fixed bg-primary text-on-primary shadow-lg shadow-primary/30"
                : "border-outline-variant/30 bg-surface/95 text-on-surface shadow-[0px_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl hover:bg-surface",
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined",
                compact ? "text-base" : "text-xl",
                isActive && "fill-icon",
                !isActive && f.value === "dry" && "text-secondary",
                !isActive && f.value === "warm" && "text-error",
                !isActive && f.value === "calm" && "text-secondary-container",
                !isActive && f.value === "cloudy" && "text-outline",
              )}
            >
              {f.icon}
            </span>
            <span>{t(`filters.${f.key}`)}</span>
          </button>
        );
      })}
      {showMapLink && (
        <Link
          href={`/map?${searchParams.toString()}`}
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
          >
            map
          </span>
          {t("filters.map")}
        </Link>
      )}
    </div>
  );
}
