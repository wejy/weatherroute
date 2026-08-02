"use client";

import { useEffect, useRef, useState } from "react";
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

/** Desktop / wide enough for a floating map control (matches Tailwind lg). */
const FLOAT_MQ = "(min-width: 1024px)";

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
  const mapAnchorRef = useRef<HTMLSpanElement>(null);
  const [wideEnough, setWideEnough] = useState(false);
  const [floatMap, setFloatMap] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(FLOAT_MQ);
    const sync = () => setWideEnough(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!showMapLink || !wideEnough) {
      setFloatMap(false);
      return;
    }
    const el = mapAnchorRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setFloatMap(!entry?.isIntersecting);
      },
      { root: null, rootMargin: "-72px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showMapLink, wideEnough, compact]);

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("weatherGoal", value);
    const qs = params.toString();
    const href = `${basePath}${qs ? `?${qs}` : ""}`;
    router.push(href, { scroll: false });
    if (basePath === "/") {
      // Prefer explicit scroll over embedding #hash in router.push (App Router
      // can drop the search string when only the hash changes on `/`).
      requestAnimationFrame(() => {
        document.getElementById("results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  const mapLinkClass = cn(
    "relative flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface/95 font-medium text-on-surface shadow-[0px_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-surface motion-reduce:transform-none",
    compact ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
  );

  return (
    <>
      <div
        data-testid="weather-filters"
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
              data-testid={`weather-filter-${f.value}`}
              onClick={() => select(f.value)}
              aria-pressed={isActive}
              className={cn(
                "relative flex min-h-11 items-center gap-2 rounded-full border font-medium shadow-sm transition-all hover:-translate-y-0.5 motion-reduce:transform-none",
                compact ? "px-3 py-2 text-xs" : "px-5 py-2.5 text-sm",
                isActive
                  ? "border-accent-container bg-accent text-on-accent shadow-[0_4px_18px_rgba(250,204,21,0.55)]"
                  : "border-outline-variant/40 bg-surface text-on-surface shadow-sm hover:border-outline-variant/70 hover:bg-surface-container-low",
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
          <span ref={mapAnchorRef} className="inline-flex">
            <DiscoverQueryLink href="/map" className={mapLinkClass}>
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
          </span>
        )}
      </div>

      {showMapLink && floatMap ? (
        <div className="pointer-events-none fixed top-1/2 right-6 z-40 hidden -translate-y-1/2 lg:block xl:right-10">
          <DiscoverQueryLink
            href="/map"
            className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-full border border-outline-variant/30 bg-surface/95 px-5 py-3 text-sm font-semibold text-on-surface shadow-[0px_12px_32px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-transform hover:-translate-y-0.5 hover:bg-surface motion-reduce:transform-none"
            aria-label={t("filters.map")}
          >
            <span
              className="material-symbols-outlined text-xl text-primary"
              aria-hidden="true"
            >
              map
            </span>
            {t("filters.map")}
          </DiscoverQueryLink>
        </div>
      ) : null}
    </>
  );
}
