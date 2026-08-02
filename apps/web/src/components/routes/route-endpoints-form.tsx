"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlaceDto, TravelMode } from "@/lib/types";
import { DEFAULT_TRAVEL_MODE, isTravelMode } from "@/lib/types";
import { PlaceAutocomplete } from "@/components/discover/place-autocomplete";
import { TravelModeSelector } from "@/components/travel/travel-mode-selector";
import { DateWhenField } from "@/components/discover/date-when-field";
import { useI18n } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import {
  destinationHref,
  isLinkableDestinationId,
} from "@/lib/discover-query";
import {
  resolveDateWindow,
  type DatePreset,
  type DateWindow,
} from "@/lib/dates";
import {
  EARLIEST_DEPARTURE_HOURS,
  formatHourOption,
} from "@/lib/departure";

function parsePreset(raw: string | null): DatePreset | undefined {
  if (
    raw === "today" ||
    raw === "tomorrow" ||
    raw === "weekend" ||
    raw === "custom"
  ) {
    return raw;
  }
  return undefined;
}

export function RouteEndpointsForm({
  initialFrom,
  initialTo,
  fromPlace,
  toPlace,
  initialMode = DEFAULT_TRAVEL_MODE,
  initialDatePreset,
  initialStartDate,
  initialEndDate,
  initialEarliestHour = null,
  isPro = false,
}: {
  initialFrom: string;
  initialTo: string;
  fromPlace?: PlaceDto;
  toPlace?: PlaceDto;
  initialMode?: TravelMode;
  initialDatePreset?: string | null;
  initialStartDate?: string | null;
  initialEndDate?: string | null;
  initialEarliestHour?: number | null;
  isPro?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fromText, setFromText] = useState(initialFrom);
  const [toText, setToText] = useState(initialTo);
  const [from, setFrom] = useState<PlaceDto | null>(fromPlace ?? null);
  const [to, setTo] = useState<PlaceDto | null>(toPlace ?? null);
  const [mode, setMode] = useState<TravelMode>(
    isTravelMode(initialMode) ? initialMode : DEFAULT_TRAVEL_MODE,
  );
  const [earliestHour, setEarliestHour] = useState<number | null>(
    initialEarliestHour,
  );
  const [error, setError] = useState<string | null>(null);

  const initialWhen = useMemo(
    () =>
      resolveDateWindow({
        preset:
          parsePreset(initialDatePreset ?? null) ??
          (initialStartDate ? "custom" : "weekend"),
        startDate: initialStartDate ?? undefined,
        endDate: initialEndDate ?? initialStartDate ?? undefined,
        locale,
      }),
    [initialDatePreset, initialStartDate, initialEndDate, locale],
  );
  const [when, setWhen] = useState<DateWindow>(initialWhen);

  async function resolveSelectedPlace(
    place: PlaceDto | null,
  ): Promise<PlaceDto | null> {
    if (!place) return null;
    if (isLinkableDestinationId(place.id)) return place;

    const params = new URLSearchParams({
      lat: String(place.lat),
      lon: String(place.lon),
      name: place.name,
      placeName: place.placeName,
    });
    if (place.id) params.set("id", place.id);

    try {
      const res = await fetch(`/api/places/resolve?${params}`);
      if (!res.ok) return place;
      const data = (await res.json()) as { place: PlaceDto | null };
      if (data.place?.id) {
        return { ...place, id: data.place.id };
      }
    } catch {
      // Keep Mapbox place; destination link stays hidden.
    }
    return place;
  }

  function buildParams(
    nextMode: TravelMode,
    nextWhen: DateWindow,
    nextFrom: PlaceDto,
    nextTo: PlaceDto,
    nextEarliest: number | null = earliestHour,
  ): URLSearchParams {
    const params = new URLSearchParams();
    params.set("from", nextFrom.placeName);
    params.set("to", nextTo.placeName);
    params.set("origin", nextFrom.placeName);
    params.set("lat", String(nextFrom.lat));
    params.set("lon", String(nextFrom.lon));
    params.set("fromLat", String(nextFrom.lat));
    params.set("fromLon", String(nextFrom.lon));
    params.set("toLat", String(nextTo.lat));
    params.set("toLon", String(nextTo.lon));
    if (isLinkableDestinationId(nextFrom.id)) {
      params.set("fromId", nextFrom.id);
    }
    if (isLinkableDestinationId(nextTo.id)) {
      params.set("toId", nextTo.id);
    }
    params.set("mode", nextMode);
    params.set("datePreset", nextWhen.preset);
    params.set("startDate", nextWhen.startDate);
    params.set("endDate", nextWhen.endDate);
    if (isPro && nextEarliest != null) {
      params.set("earliestHour", String(nextEarliest));
    }
    return params;
  }

  function applyRoute(
    nextMode: TravelMode = mode,
    nextWhen: DateWindow = when,
    nextEarliest: number | null = earliestHour,
  ) {
    if (!from || !to) {
      setError(t("routes.pickBoth"));
      return;
    }
    setError(null);
    const params = buildParams(nextMode, nextWhen, from, to, nextEarliest);
    startTransition(() => {
      router.push(`/routes?${params.toString()}`);
    });
  }

  function onModeChange(next: TravelMode) {
    setMode(next);
    if (from && to) {
      applyRoute(next, when, earliestHour);
    }
  }

  function onWhenChange(next: DateWindow) {
    setWhen(next);
    if (from && to) {
      applyRoute(mode, next, earliestHour);
    }
  }

  function onEarliestChange(raw: string) {
    const next = raw === "any" ? null : Number(raw);
    const hour =
      next != null && EARLIEST_DEPARTURE_HOURS.includes(next) ? next : null;
    setEarliestHour(hour);
    if (isPro && from && to) {
      applyRoute(mode, when, hour);
    }
  }

  const toDestinationHref =
    to && isLinkableDestinationId(to.id)
      ? destinationHref(to.id, {
          datePreset: when.preset,
          startDate: when.startDate,
          endDate: when.endDate,
          origin: from?.placeName ?? initialFrom,
          lat: from?.lat,
          lon: from?.lon,
          mode,
        })
      : null;

  return (
    <div
      data-testid="route-endpoints-form"
      className="space-y-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4"
    >
      <div>
        <p className="mb-1.5 text-sm font-medium tracking-wide text-on-surface-variant uppercase">
          {t("search.whenGoing")}
        </p>
        <div className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2">
          <DateWhenField value={when} onChange={onWhenChange} />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium tracking-wide text-on-surface-variant uppercase">
          {t("routes.travelMode")}
        </p>
        <TravelModeSelector value={mode} onChange={onModeChange} />
      </div>

      <div>
        <label
          htmlFor="route-from"
          className="mb-1 block text-sm font-medium tracking-wide text-on-surface-variant uppercase"
        >
          {t("routes.from")}
        </label>
        <div className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2">
          <PlaceAutocomplete
            id="route-from"
            value={fromText}
            onChange={setFromText}
            onPlaceSelect={(place) => {
              void resolveSelectedPlace(place).then(setFrom);
            }}
            placeholder={t("routes.fromPlaceholder")}
            ariaLabel={t("routes.from")}
            proximity={from ? { lat: from.lat, lon: from.lon } : null}
            inputClassName="text-base"
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <label
            htmlFor="route-to"
            className="text-sm font-medium tracking-wide text-on-surface-variant uppercase"
          >
            {t("routes.to")}
          </label>
          {toDestinationHref ? (
            <Link
              href={toDestinationHref}
              className="inline-flex items-center gap-0.5 text-sm font-medium text-secondary hover:underline"
            >
              {t("routes.viewDestination")}
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                open_in_new
              </span>
            </Link>
          ) : null}
        </div>
        <div className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2">
          <PlaceAutocomplete
            id="route-to"
            value={toText}
            onChange={setToText}
            onPlaceSelect={(place) => {
              void resolveSelectedPlace(place).then(setTo);
            }}
            placeholder={t("routes.toPlaceholder")}
            ariaLabel={t("routes.to")}
            proximity={from ? { lat: from.lat, lon: from.lon } : null}
            inputClassName="text-base"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <div>
        <label
          htmlFor="route-earliest"
          className="mb-1.5 block text-sm font-medium tracking-wide text-on-surface-variant uppercase"
        >
          {t("routes.earliestDepartureLabel")}
        </label>
        <select
          id="route-earliest"
          value={earliestHour == null ? "any" : String(earliestHour)}
          onChange={(e) => onEarliestChange(e.target.value)}
          disabled={!isPro}
          className="w-full min-h-11 rounded-lg border border-outline-variant/30 bg-surface px-3 py-2.5 text-base text-on-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          <option value="any">{t("routes.earliestDepartureAny")}</option>
          {EARLIEST_DEPARTURE_HOURS.map((h) => (
            <option key={h} value={h}>
              {isPro
                ? formatHourOption(h)
                : t("routes.earliestDepartureOptionPro", {
                    time: formatHourOption(h),
                  })}
            </option>
          ))}
        </select>
        {!isPro ? (
          <p className="mt-1.5 text-xs text-on-surface-variant">
            {t("routes.earliestDepartureProNote")}{" "}
            <Link href="/pro" className="font-medium text-primary underline-offset-2 hover:underline">
              {t("routes.earliestDepartureUpgrade")}
            </Link>
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => applyRoute()}
        disabled={pending}
        className={cn(
          "flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-base font-semibold text-on-accent shadow-sm transition-colors hover:bg-accent-container hover:text-on-accent-container",
          pending && "opacity-70",
        )}
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          route
        </span>
        {pending ? t("search.searching") : t("routes.updateRoute")}
      </button>
    </div>
  );
}
