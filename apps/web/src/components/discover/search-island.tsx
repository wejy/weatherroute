"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { PlaceDto, TravelMode } from "@/lib/types";
import { DEFAULT_TRAVEL_MODE, isTravelMode } from "@/lib/types";
import {
  resolveDateWindow,
  type DatePreset,
  type DateWindow,
} from "@/lib/dates";
import {
  CUSTOM_RADIUS_DEFAULT_KM,
  CUSTOM_RADIUS_MAX_KM,
  CUSTOM_RADIUS_MIN_KM,
  DEFAULT_DISTANCE_KEY,
  DISTANCE_PRESET_KEYS,
  DISTANCE_RADIUS_KM,
  FREE_MAX_DISTANCE_KEY,
  formatDistanceKm,
  isProDistance,
  resolveRadiusKm,
  type DistanceKey,
} from "@/lib/distance";
import {
  LocationOriginField,
  type GeoDetectMeta,
} from "@/components/discover/location-origin-field";
import { DateWhenField } from "@/components/discover/date-when-field";
import { FieldSelect } from "@/components/discover/field-select";
import { TravelModeSelector } from "@/components/travel/travel-mode-selector";
import { DiscoverPendingUpdate } from "@/components/discover/discover-pending-update";
import { useI18n } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

const GOAL_KEYS = ["best", "sun", "dry", "mild", "rain", "warm"] as const;

const DISTANCE_OPTIONS = [...DISTANCE_PRESET_KEYS, "custom" as const];

export function DiscoverSearch({
  defaults,
  basePath = "/",
  hash = "#results",
  variant = "island",
  autoDetect,
  /** Hide the weather-goal dropdown when chips are shown separately. */
  showGoalField = true,
  /** Subscription tier — locks Region / Continent / Custom for non-pro. */
  tier = "anon",
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
    mode?: string;
  };
  basePath?: string;
  hash?: string;
  variant?: "island" | "stack";
  autoDetect?: boolean;
  showGoalField?: boolean;
  tier?: "anon" | "free" | "pro";
}) {
  const { t, locale } = useI18n();
  const isPro = tier === "pro";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  /** Local filter edits that are not yet reflected in the URL / results. */
  const [filtersDirty, setFiltersDirty] = useState(false);
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

  const initialDistance =
    !isPro && isProDistance(defaults?.distance)
      ? FREE_MAX_DISTANCE_KEY
      : (defaults?.distance ?? DEFAULT_DISTANCE_KEY);

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
  const [distance, setDistance] = useState(initialDistance);
  const [customRadiusKm, setCustomRadiusKm] = useState(
    defaults?.radiusKm ?? CUSTOM_RADIUS_DEFAULT_KM,
  );
  const [weatherGoal, setWeatherGoal] = useState(
    defaults?.weatherGoal ?? "best",
  );
  const [travelMode, setTravelMode] = useState<TravelMode>(
    isTravelMode(defaults?.mode) ? defaults.mode : DEFAULT_TRAVEL_MODE,
  );
  const [error, setError] = useState<string | null>(null);

  // Keep local fields in sync when URL/query defaults change (chips ↔ form ↔ map).
  useEffect(() => {
    if (defaults?.weatherGoal) setWeatherGoal(defaults.weatherGoal);
  }, [defaults?.weatherGoal]);

  useEffect(() => {
    if (isTravelMode(defaults?.mode)) setTravelMode(defaults.mode);
  }, [defaults?.mode]);

  useEffect(() => {
    if (!defaults?.distance) return;
    setDistance(
      !isPro && isProDistance(defaults.distance)
        ? FREE_MAX_DISTANCE_KEY
        : defaults.distance,
    );
  }, [defaults?.distance, isPro]);

  useEffect(() => {
    if (defaults?.radiusKm != null) setCustomRadiusKm(defaults.radiusKm);
  }, [defaults?.radiusKm]);

  useEffect(() => {
    if (defaults?.origin) setOrigin(defaults.origin);
    if (
      defaults?.lat != null &&
      defaults?.lon != null &&
      !Number.isNaN(defaults.lat) &&
      !Number.isNaN(defaults.lon)
    ) {
      setPlace({
        id: `url-${defaults.lat.toFixed(3)},${defaults.lon.toFixed(3)}`,
        name: defaults.origin?.split(",")[0]?.trim() || "Origin",
        placeName: defaults.origin || "",
        lat: defaults.lat,
        lon: defaults.lon,
      });
      geoSynced.current = true;
    }
  }, [defaults?.origin, defaults?.lat, defaults?.lon]);

  useEffect(() => {
    if (defaults?.datePreset || defaults?.startDate || defaults?.endDate) {
      setWhen(
        resolveDateWindow({
          preset: (defaults?.datePreset as DatePreset) || "weekend",
          startDate: defaults?.startDate,
          endDate: defaults?.endDate,
          locale,
        }),
      );
    }
  }, [
    defaults?.datePreset,
    defaults?.startDate,
    defaults?.endDate,
    locale,
  ]);

  // URL caught up after Search — clear pending notice (not on weatherGoal-only chip changes).
  useEffect(() => {
    setFiltersDirty(false);
  }, [
    defaults?.origin,
    defaults?.lat,
    defaults?.lon,
    defaults?.distance,
    defaults?.radiusKm,
    defaults?.datePreset,
    defaults?.startDate,
    defaults?.endDate,
    defaults?.mode,
  ]);

  const effectiveRadiusKm = resolveRadiusKm(
    distance,
    distance === "custom" ? customRadiusKm : undefined,
  );

  const buildParams = useCallback(
    (
      resolved: PlaceDto,
      overrides?: {
        distance?: string;
        radiusKm?: number;
        weatherGoal?: string;
        when?: DateWindow;
        mode?: TravelMode;
      },
    ) => {
      const nextDistance = overrides?.distance ?? distance;
      const nextRadius = overrides?.radiusKm ?? customRadiusKm;
      const liveGoal =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("weatherGoal")
          : null;
      // Prefer address-bar goal so filter chips aren't stomped by in-flight geo.
      const nextGoal =
        overrides?.weatherGoal ??
        liveGoal ??
        searchParams.get("weatherGoal") ??
        weatherGoal;
      const nextWhen = overrides?.when ?? when;
      const nextMode = overrides?.mode ?? travelMode;
      const params = new URLSearchParams(searchParams.toString());
      params.set("origin", resolved.placeName);
      params.set("lat", String(resolved.lat));
      params.set("lon", String(resolved.lon));
      params.set("distance", nextDistance);
      params.set("weatherGoal", nextGoal);
      params.set("datePreset", nextWhen.preset);
      params.set("startDate", nextWhen.startDate);
      params.set("endDate", nextWhen.endDate);
      params.set("mode", nextMode);
      if (nextDistance === "custom") {
        params.set("radiusKm", String(nextRadius));
      } else {
        params.delete("radiusKm");
      }
      return params;
    },
    [customRadiusKm, distance, searchParams, travelMode, weatherGoal, when],
  );

  const navigateWith = useCallback(
    (
      resolved: PlaceDto,
      replace = false,
      overrides?: {
        distance?: string;
        radiusKm?: number;
        weatherGoal?: string;
        when?: DateWindow;
        mode?: TravelMode;
      },
    ) => {
      const url = `${basePath}?${buildParams(resolved, overrides).toString()}${hash || ""}`;
      setFiltersDirty(false);
      startTransition(() => {
        if (replace) router.replace(url);
        else router.push(url);
      });
    },
    [basePath, buildParams, hash, router],
  );

  const onGeolocated = useCallback(
    (detected: PlaceDto, meta: GeoDetectMeta) => {
      // Coarse auto-detect: only once, and never overwrite an existing URL origin.
      // Precise (user tapped locate): always commit a new search.
      if (meta.mode === "coarse" && (hasCoords || geoSynced.current)) {
        return;
      }
      geoSynced.current = true;
      setPlace(detected);
      setOrigin(detected.placeName);
      setFiltersDirty(false);
      let distanceOverride: string | undefined =
        meta.mode === "coarse" ? meta.suggestedDistance : undefined;
      if (distanceOverride && !isPro && isProDistance(distanceOverride)) {
        distanceOverride = FREE_MAX_DISTANCE_KEY;
      }
      if (distanceOverride) setDistance(distanceOverride);
      navigateWith(
        detected,
        true,
        distanceOverride ? { distance: distanceOverride } : undefined,
      );
    },
    [hasCoords, isPro, navigateWith],
  );

  function onPlaceSelect(next: PlaceDto | null) {
    setPlace(next);
    setError(null);
    if (next) {
      setOrigin(next.placeName);
      // Block a late auto-geo from overwriting a manual pick; Search commits URL.
      geoSynced.current = true;
      setFiltersDirty(true);
    } else {
      setFiltersDirty(true);
    }
  }

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

  async function commitSearch(replace = false) {
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
      navigateWith(resolved, replace);
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await commitSearch(false);
  }

  function onDistanceChange(next: string) {
    if (!isPro && isProDistance(next)) return;
    setDistance(next);
    if (next !== "custom" && next in DISTANCE_RADIUS_KM) {
      setCustomRadiusKm(DISTANCE_RADIUS_KM[next as DistanceKey]);
    }
    setFiltersDirty(true);
  }

  function onGoalChange(next: string) {
    setWeatherGoal(next);
    // Weather-goal chips/dropdown apply immediately (button-style).
    if (place) {
      navigateWith(place, true, { weatherGoal: next });
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("weatherGoal", next);
    startTransition(() => {
      router.replace(
        `${basePath}?${params.toString()}${hash || ""}`,
      );
    });
  }

  function onTravelModeChange(next: TravelMode) {
    setTravelMode(next);
    setFiltersDirty(true);
  }

  const fieldClass = stack
    ? "rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2.5"
    : "group relative min-w-0 border-b border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6 md:py-4 lg:border-r lg:border-b-0";

  const labelClass = stack
    ? "mb-1 block text-left text-xs font-medium tracking-wide text-on-surface-variant uppercase"
    : "mb-1 block truncate text-left text-sm font-medium text-on-surface-variant transition-colors group-hover:text-primary";

  const distanceOptions = DISTANCE_OPTIONS.map((key) => {
    const locked = !isPro && isProDistance(key);
    const full = t(`search.distances.${key}`);
    const compact = t(`search.distancesCompact.${key}`);
    return {
      value: key,
      disabled: locked,
      label: locked
        ? t("search.distanceProOption", { label: full })
        : full,
      compactLabel: locked
        ? t("search.distanceProOption", { label: compact })
        : compact,
    };
  });

  const goalOptions = GOAL_KEYS.map((key) => ({
    value: key,
    label: t(`search.goals.${key}`),
  }));

  return (
    <>
    <form
      onSubmit={onSubmit}
      className={cn(
        stack
          ? "flex w-full flex-col gap-3"
          : "relative z-40 flex w-full max-w-5xl flex-col overflow-visible rounded-[2rem] border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] md:p-4 lg:flex-row lg:flex-nowrap lg:items-stretch lg:pr-10",
      )}
    >
      <div
        className={cn(
          fieldClass,
          !stack && "flex-[1.8] rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none",
        )}
      >
        <label
          htmlFor="origin-location-input"
          id={originLabelId}
          className={labelClass}
        >
          {t("search.whereFrom")}
        </label>
        <LocationOriginField
          value={origin}
          onChange={(v) => {
            setOrigin(v);
            setError(null);
            setFiltersDirty(true);
          }}
          onPlaceSelect={onPlaceSelect}
          onGeolocated={onGeolocated}
          autoDetect={shouldAutoDetect}
          labelledBy={originLabelId}
          inputId="origin-location-input"
        />
        {error && (
          <p className="mt-1 text-left text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={cn(fieldClass, !stack && "flex-[1.1]")}>
        <span id={whenLabelId} className={labelClass}>
          {t("search.whenGoing")}
        </span>
        <DateWhenField
          value={when}
          labelledBy={whenLabelId}
          onChange={(next) => {
            setWhen(next);
            setFiltersDirty(true);
          }}
        />
      </div>

      <div className={cn(fieldClass, !stack && "flex-none")}>
        <p className={labelClass}>{t("travel.modeLabel")}</p>
        <TravelModeSelector
          value={travelMode}
          onChange={onTravelModeChange}
          size="sm"
        />
      </div>

      <div
        className={cn(
          fieldClass,
          !stack && "max-w-[11rem] flex-[0.85]",
          !stack &&
            !showGoalField &&
            "rounded-b-2xl lg:rounded-r-2xl lg:rounded-bl-none lg:border-r-0",
        )}
      >
        <label id={distanceId} className={labelClass}>
          {t("search.howFar")}
        </label>
        <FieldSelect
          value={distance}
          options={distanceOptions}
          onChange={onDistanceChange}
          labelledBy={distanceId}
          icon="radar"
          size={stack ? "sm" : "lg"}
          menuAlign="end"
        />
        {!isPro && stack ? (
          <p className="mt-1 text-left text-[10px] leading-snug break-words text-outline">
            {t("search.distanceProHint")}{" "}
            <a
              href="/settings"
              className="font-semibold text-primary/80 underline-offset-2 hover:underline"
            >
              {t("settings.subscriptionCta")}
            </a>
          </p>
        ) : null}
        {distance === "custom" && (
          <div className="mt-3 space-y-1.5 text-left">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-on-surface-variant">
              <span>{t("search.customRadius")}</span>
              <span className="tabular-nums text-on-surface">
                {formatDistanceKm(customRadiusKm, locale)}
              </span>
            </div>
            <input
              type="range"
              min={CUSTOM_RADIUS_MIN_KM}
              max={CUSTOM_RADIUS_MAX_KM}
              step={10}
              value={customRadiusKm}
              onChange={(e) => {
                const value = Number(e.target.value);
                setCustomRadiusKm(value);
                setFiltersDirty(true);
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-container accent-primary"
              aria-label={t("search.customRadius")}
            />
            <p className="text-[10px] leading-snug text-outline">
              {t("search.customRadiusHint")}
            </p>
          </div>
        )}
        {distance !== "custom" && (
          <p className="mt-1 text-left text-[10px] leading-snug text-outline">
            {formatDistanceKm(effectiveRadiusKm, locale)}
          </p>
        )}
      </div>

      {showGoalField && (
        <div
          className={cn(
            fieldClass,
            !stack && "min-w-0 flex-1",
            !stack &&
              "cursor-pointer rounded-b-2xl lg:rounded-r-2xl lg:rounded-bl-none lg:border-r-0",
          )}
        >
          <label id={goalId} className={labelClass}>
            {t("search.weatherGoal")}
          </label>
          <FieldSelect
            value={weatherGoal}
            options={goalOptions}
            onChange={onGoalChange}
            labelledBy={goalId}
            icon="wb_sunny"
            size={stack ? "sm" : "lg"}
            menuAlign="end"
          />
        </div>
      )}

      <div
        className={cn(
          stack
            ? "pt-1"
            : "mt-2 flex w-full justify-center p-2 md:p-3 lg:absolute lg:top-1/2 lg:right-0 lg:z-50 lg:mt-0 lg:w-auto lg:-translate-y-1/2 lg:translate-x-[55%] lg:pl-0",
        )}
      >
        <button
          type="submit"
          disabled={pending}
          aria-label={t("a11y.searchDestinations")}
          aria-busy={pending || undefined}
          className={cn(
            "flex items-center justify-center gap-2 bg-accent text-on-accent shadow-md transition-all hover:bg-accent-container hover:text-on-accent-container disabled:cursor-wait disabled:bg-accent/80",
            stack
              ? "h-11 w-full rounded-xl text-sm font-semibold"
              : "h-14 w-full rounded-xl lg:h-16 lg:w-16 lg:rounded-full",
            filtersDirty &&
              "ring-2 ring-primary ring-offset-2 ring-offset-surface",
          )}
        >
          <span
            className="material-symbols-outlined text-2xl"
            aria-hidden="true"
          >
            search
          </span>
          <span
            className={cn(
              "font-semibold",
              stack ? "text-base" : "text-xl lg:hidden",
            )}
          >
            {pending
              ? t("search.searching")
              : filtersDirty
                ? t("search.updateResults")
                : t("search.search")}
          </span>
        </button>
      </div>
    </form>
    <DiscoverPendingUpdate
      visible={filtersDirty && Boolean(place || origin.trim())}
      activityKey={[
        origin,
        place?.lat,
        place?.lon,
        distance,
        customRadiusKm,
        when.preset,
        when.startDate,
        when.endDate,
        travelMode,
      ].join("|")}
      pending={pending}
      onUpdate={() => {
        void commitSearch(false);
      }}
    />
    </>
  );
}
