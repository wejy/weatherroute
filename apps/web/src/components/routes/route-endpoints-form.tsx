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
  initialPrefer = "fast",
}: {
  initialFrom: string;
  initialTo: string;
  fromPlace?: PlaceDto;
  toPlace?: PlaceDto;
  initialMode?: TravelMode;
  initialDatePreset?: string | null;
  initialStartDate?: string | null;
  initialEndDate?: string | null;
  initialPrefer?: "fast" | "weather";
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
  const [prefer, setPrefer] = useState<"fast" | "weather">(
    initialPrefer === "weather" ? "weather" : "fast",
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
    nextPrefer: "fast" | "weather" = prefer,
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
    params.set("prefer", nextPrefer);
    params.set("datePreset", nextWhen.preset);
    params.set("startDate", nextWhen.startDate);
    params.set("endDate", nextWhen.endDate);
    return params;
  }

  function applyRoute(
    nextMode: TravelMode = mode,
    nextWhen: DateWindow = when,
    nextPrefer: "fast" | "weather" = prefer,
  ) {
    if (!from || !to) {
      setError(t("routes.pickBoth"));
      return;
    }
    setError(null);
    setPrefer(nextPrefer);
    const params = buildParams(nextMode, nextWhen, from, to, nextPrefer);
    startTransition(() => {
      router.push(`/routes?${params.toString()}`);
    });
  }

  function onModeChange(next: TravelMode) {
    setMode(next);
    if (from && to) {
      applyRoute(next, when, prefer);
    }
  }

  function onWhenChange(next: DateWindow) {
    setWhen(next);
    if (from && to) {
      applyRoute(mode, next, prefer);
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
    <div className="space-y-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
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

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => applyRoute(mode, when, "fast")}
          disabled={pending}
          className={cn(
            "flex w-full min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold shadow-sm transition-colors",
            prefer === "fast"
              ? "bg-primary text-on-primary hover:bg-primary-container"
              : "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container",
            pending && "opacity-70",
          )}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            speed
          </span>
          {pending && prefer === "fast"
            ? t("search.searching")
            : t("routes.updateRoute")}
        </button>
        <button
          type="button"
          onClick={() => applyRoute(mode, when, "weather")}
          disabled={pending}
          title={t("routes.preferWeatherHint")}
          className={cn(
            "flex w-full min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold shadow-sm transition-colors",
            prefer === "weather"
              ? "bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container"
              : "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container",
            pending && "opacity-70",
          )}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            partly_cloudy_day
          </span>
          {pending && prefer === "weather"
            ? t("search.searching")
            : t("routes.updateRouteWeather")}
        </button>
        <p className="text-xs text-on-surface-variant">
          {prefer === "weather"
            ? t("routes.preferWeatherHint")
            : t("routes.preferFastHint")}
        </p>
      </div>
    </div>
  );
}
