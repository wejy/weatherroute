"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useRef, useState, useTransition } from "react";
import type { PlaceDto } from "@/lib/types";
import {
  resolveDateWindow,
  type DatePreset,
  type DateWindow,
} from "@/lib/dates";
import {
  CUSTOM_RADIUS_DEFAULT_KM,
  CUSTOM_RADIUS_MAX_KM,
  CUSTOM_RADIUS_MIN_KM,
  DISTANCE_PRESET_KEYS,
  DISTANCE_RADIUS_KM,
  resolveRadiusKm,
  type DistanceKey,
} from "@/lib/distance";
import { LocationOriginField, type GeoDetectMeta } from "@/components/discover/location-origin-field";
import { DateWhenField } from "@/components/discover/date-when-field";
import { useI18n } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

const GOAL_KEYS = ["sun", "dry", "mild", "warm"] as const;

const DISTANCE_OPTIONS = [...DISTANCE_PRESET_KEYS, "custom" as const];

export function DiscoverSearch({
  defaults,
  basePath = "/",
  hash = "#results",
  variant = "island",
  autoDetect,
}: {
  defaults?: {
    origin?: string;
    distance?: string;
    radiusKm?: number;
    weatherGoal?: string;
    lat?: number;
    lon?: number;
    datePreset?: string;
    startDate?: string;
    endDate?: string;
  };
  /** Where search updates should navigate (e.g. `/` or `/map`). */
  basePath?: string;
  hash?: string;
  variant?: "island" | "stack";
  /** Override geolocation auto-detect (default: when coords missing). */
  autoDetect?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const geoSynced = useRef(false);
  const hasCoords =
    defaults?.lat != null &&
    defaults?.lon != null &&
    !Number.isNaN(defaults.lat) &&
    !Number.isNaN(defaults.lon);
  const shouldAutoDetect = autoDetect ?? !hasCoords;
  const stack = variant === "stack";
  const distanceId = useId();
  const goalId = useId();
  const whenLabelId = useId();
  const originLabelId = useId();

  const initialWindow = useMemo(
    () =>
      resolveDateWindow({
        preset: (defaults?.datePreset as DatePreset) || "weekend",
        startDate: defaults?.startDate,
        endDate: defaults?.endDate,
        locale,
      }),
    [defaults?.datePreset, defaults?.startDate, defaults?.endDate, locale],
  );

  const [origin, setOrigin] = useState(defaults?.origin ?? "");
  const [place, setPlace] = useState<PlaceDto | null>(
    hasCoords
      ? {
          id: "default",
          name: defaults?.origin?.split(",")[0]?.trim() || "Origin",
          placeName: defaults?.origin || "",
          lat: defaults!.lat!,
          lon: defaults!.lon!,
        }
      : null,
  );
  const [when, setWhen] = useState<DateWindow>(initialWindow);
  const [distance, setDistance] = useState(defaults?.distance ?? "region");
  const [customRadiusKm, setCustomRadiusKm] = useState(
    defaults?.radiusKm ?? CUSTOM_RADIUS_DEFAULT_KM,
  );
  const [weatherGoal, setWeatherGoal] = useState(
    defaults?.weatherGoal ?? "sun",
  );
  const [error, setError] = useState<string | null>(null);

  const effectiveRadiusKm = resolveRadiusKm(
    distance,
    distance === "custom" ? customRadiusKm : undefined,
  );

  const buildParams = useCallback(
    (
      resolved: PlaceDto,
      overrides?: { distance?: string; radiusKm?: number },
    ) => {
      const nextDistance = overrides?.distance ?? distance;
      const nextRadius = overrides?.radiusKm ?? customRadiusKm;
      const params = new URLSearchParams({
        origin: resolved.placeName,
        lat: String(resolved.lat),
        lon: String(resolved.lon),
        distance: nextDistance,
        weatherGoal,
        datePreset: when.preset,
        startDate: when.startDate,
        endDate: when.endDate,
      });
      if (nextDistance === "custom") {
        params.set("radiusKm", String(nextRadius));
      }
      return params;
    },
    [distance, customRadiusKm, weatherGoal, when],
  );

  const navigateWith = useCallback(
    (
      resolved: PlaceDto,
      replace = false,
      overrides?: { distance?: string; radiusKm?: number },
    ) => {
      const url = `${basePath}?${buildParams(resolved, overrides).toString()}${hash || ""}`;
      if (replace) router.replace(url);
      else router.push(url);
    },
    [basePath, buildParams, hash, router],
  );

  const onGeolocated = useCallback(
    (detected: PlaceDto, meta: GeoDetectMeta) => {
      if (hasCoords || geoSynced.current) return;
      geoSynced.current = true;
      setPlace(detected);
      setOrigin(detected.placeName);
      const distanceOverride =
        meta.mode === "coarse" ? meta.suggestedDistance : undefined;
      if (distanceOverride) setDistance(distanceOverride);
      navigateWith(
        detected,
        true,
        distanceOverride ? { distance: distanceOverride } : undefined,
      );
    },
    [hasCoords, navigateWith],
  );

  async function resolvePlace(): Promise<PlaceDto | null> {
    if (place) return place;
    const q = origin.trim();
    if (q.length < 2) return null;

    const res = await fetch(
      `/api/search?q=${encodeURIComponent(q)}&limit=1`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { results: PlaceDto[] };
    return data.results[0] ?? null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!origin.trim() && !place) {
      setError(t("search.chooseOrigin"));
      return;
    }

    startTransition(async () => {
      const resolved = await resolvePlace();
      if (!resolved) {
        setError(t("search.placeNotFound"));
        return;
      }

      setPlace(resolved);
      setOrigin(resolved.placeName);
      navigateWith(resolved);
    });
  }

  function onDistanceChange(next: string) {
    setDistance(next);
    if (next !== "custom" && next in DISTANCE_RADIUS_KM) {
      setCustomRadiusKm(DISTANCE_RADIUS_KM[next as DistanceKey]);
    }
  }

  const fieldClass = stack
    ? "rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2.5"
    : "group relative flex-1 border-b border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6 md:py-4 lg:border-r lg:border-b-0";

  const labelClass = stack
    ? "mb-1 block text-left text-xs font-medium tracking-wide text-on-surface-variant uppercase"
    : "mb-1 block text-left text-sm font-medium text-on-surface-variant transition-colors group-hover:text-primary";

  const selectClass = stack
    ? "w-full cursor-pointer appearance-none border-none bg-transparent p-0 text-base font-semibold text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    : "w-full cursor-pointer appearance-none border-none bg-transparent p-0 pr-4 text-xl font-semibold text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        stack
          ? "flex w-full flex-col gap-3"
          : "relative z-40 flex w-full max-w-5xl flex-col rounded-[2rem] border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] md:p-4 lg:flex-row lg:flex-wrap",
      )}
    >
      <div
        className={cn(
          fieldClass,
          !stack &&
            "rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none",
        )}
      >
        <label id={originLabelId} className={labelClass}>
          {t("search.whereFrom")}
        </label>
        <LocationOriginField
          value={origin}
          onChange={(v) => {
            setOrigin(v);
            setError(null);
          }}
          onPlaceSelect={setPlace}
          onGeolocated={onGeolocated}
          autoDetect={shouldAutoDetect}
        />
        {error && (
          <p className="mt-1 text-left text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={fieldClass}>
        <label id={whenLabelId} className={labelClass}>
          {t("search.whenGoing")}
        </label>
        <DateWhenField value={when} onChange={setWhen} />
      </div>

      <div className={fieldClass}>
        <label htmlFor={distanceId} className={labelClass}>
          {t("search.howFar")}
        </label>
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className="material-symbols-outlined text-xl text-secondary"
            aria-hidden="true"
          >
            radar
          </span>
          <select
            id={distanceId}
            className={selectClass}
            value={distance}
            onChange={(e) => onDistanceChange(e.target.value)}
          >
            {DISTANCE_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {t(`search.distances.${key}`)}
              </option>
            ))}
          </select>
        </div>
        {distance === "custom" && (
          <div className="mt-3 space-y-1.5 text-left">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-on-surface-variant">
              <span>{t("search.customRadius")}</span>
              <span className="tabular-nums text-on-surface">
                {customRadiusKm.toLocaleString(
                  locale === "fi" ? "fi-FI" : "en-GB",
                )}{" "}
                km
              </span>
            </div>
            <input
              type="range"
              min={CUSTOM_RADIUS_MIN_KM}
              max={CUSTOM_RADIUS_MAX_KM}
              step={10}
              value={customRadiusKm}
              onChange={(e) => setCustomRadiusKm(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-container accent-primary"
              aria-label={t("search.customRadius")}
            />
            <p className="text-[11px] text-on-surface-variant">
              {t("search.customRadiusHint")}
            </p>
          </div>
        )}
        {distance !== "custom" && (
          <p className="mt-1 text-left text-xs text-on-surface-variant">
            {effectiveRadiusKm.toLocaleString(
              locale === "fi" ? "fi-FI" : "en-GB",
            )}{" "}
            km
          </p>
        )}
      </div>

      <div
        className={cn(
          fieldClass,
          !stack &&
            "cursor-pointer rounded-b-2xl lg:rounded-r-2xl lg:rounded-bl-none",
        )}
      >
        <label htmlFor={goalId} className={labelClass}>
          {t("search.weatherGoal")}
        </label>
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className="material-symbols-outlined text-xl text-secondary"
            aria-hidden="true"
          >
            wb_sunny
          </span>
          <select
            id={goalId}
            className={selectClass}
            value={weatherGoal}
            onChange={(e) => setWeatherGoal(e.target.value)}
          >
            {GOAL_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`search.goals.${key}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={cn(
          stack
            ? "pt-1"
            : "mt-2 flex w-full justify-center p-2 md:p-3 lg:absolute lg:top-1/2 lg:-right-4 lg:mt-0 lg:w-auto lg:-translate-y-1/2 lg:pl-0",
        )}
      >
        <button
          type="submit"
          disabled={pending}
          aria-label={t("a11y.searchDestinations")}
          aria-busy={pending || undefined}
          className={cn(
            "flex items-center justify-center gap-2 bg-primary text-on-primary shadow-md transition-all hover:bg-on-primary-fixed-variant disabled:cursor-wait disabled:bg-primary/80",
            stack
              ? "h-11 w-full rounded-xl text-sm font-semibold"
              : "h-14 w-full rounded-xl lg:h-16 lg:w-16 lg:rounded-full",
          )}
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">
            search
          </span>
          <span
            className={cn(
              "font-semibold",
              stack ? "text-base" : "text-xl lg:hidden",
            )}
          >
            {pending ? t("search.searching") : t("search.search")}
          </span>
        </button>
      </div>
    </form>
  );
}
