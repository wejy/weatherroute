"use client";

import Link from "next/link";
import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlaceDto, TravelMode } from "@/lib/types";
import { DEFAULT_TRAVEL_MODE, isTravelMode } from "@/lib/types";
import { PlaceAutocomplete } from "@/components/discover/place-autocomplete";
import { LocationOriginField } from "@/components/discover/location-origin-field";
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
  DEPARTURE_HOURS,
  formatHourOption,
  normalizeDepartureWindow,
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
  initialDepartureStartHour = null,
  initialDepartureEndHour = null,
  isPro = false,
  highlightEmptyTo = false,
}: {
  initialFrom: string;
  initialTo: string;
  fromPlace?: PlaceDto;
  toPlace?: PlaceDto;
  initialMode?: TravelMode;
  initialDatePreset?: string | null;
  initialStartDate?: string | null;
  initialEndDate?: string | null;
  initialDepartureStartHour?: number | null;
  initialDepartureEndHour?: number | null;
  isPro?: boolean;
  /** Emphasize empty destination (e.g. origin outside Finland). */
  highlightEmptyTo?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const whenLabelId = useId();
  const fromLabelId = useId();
  const toLabelId = useId();
  const [pending, startTransition] = useTransition();
  const [fromText, setFromText] = useState(initialFrom);
  const [toText, setToText] = useState(initialTo);
  const [from, setFrom] = useState<PlaceDto | null>(fromPlace ?? null);
  const [to, setTo] = useState<PlaceDto | null>(toPlace ?? null);
  const [mode, setMode] = useState<TravelMode>(
    isTravelMode(initialMode) ? initialMode : DEFAULT_TRAVEL_MODE,
  );
  const [departureStartHour, setDepartureStartHour] = useState<number | null>(
    initialDepartureStartHour,
  );
  const [departureEndHour, setDepartureEndHour] = useState<number | null>(
    initialDepartureEndHour,
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
  const showToHighlight = highlightEmptyTo && !to && !toText.trim();

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
    nextStart: number | null = departureStartHour,
    nextEnd: number | null = departureEndHour,
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
    if (isPro && nextStart != null) {
      params.set("departureStartHour", String(nextStart));
    }
    if (isPro && nextEnd != null) {
      params.set("departureEndHour", String(nextEnd));
    }
    return params;
  }

  function applyRoute(
    nextMode: TravelMode = mode,
    nextWhen: DateWindow = when,
    nextStart: number | null = departureStartHour,
    nextEnd: number | null = departureEndHour,
  ) {
    if (!from || !to) {
      setError(t("routes.pickBoth"));
      return;
    }
    const normalized = normalizeDepartureWindow(nextStart, nextEnd);
    if (!normalized.ok) {
      setError(t("routes.departureWindowInvalid"));
      return;
    }
    setError(null);
    const params = buildParams(
      nextMode,
      nextWhen,
      from,
      to,
      normalized.window.startHour,
      normalized.window.endHour,
    );
    startTransition(() => {
      router.push(`/routes?${params.toString()}`);
    });
  }

  function onModeChange(next: TravelMode) {
    setMode(next);
    if (from && to) {
      applyRoute(next, when, departureStartHour, departureEndHour);
    }
  }

  function onWhenChange(next: DateWindow) {
    setWhen(next);
    if (from && to) {
      applyRoute(mode, next, departureStartHour, departureEndHour);
    }
  }

  function parseHourSelect(raw: string): number | null {
    if (raw === "any") return null;
    const next = Number(raw);
    return DEPARTURE_HOURS.includes(next) ? next : null;
  }

  function onStartChange(raw: string) {
    const hour = parseHourSelect(raw);
    setDepartureStartHour(hour);
    if (isPro && from && to) {
      applyRoute(mode, when, hour, departureEndHour);
    }
  }

  function onEndChange(raw: string) {
    const hour = parseHourSelect(raw);
    setDepartureEndHour(hour);
    if (isPro && from && to) {
      applyRoute(mode, when, departureStartHour, hour);
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
        <p
          id={whenLabelId}
          className="mb-1.5 text-sm font-medium tracking-wide text-on-surface-variant uppercase"
        >
          {t("search.whenGoing")}
        </p>
        <div className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2">
          <DateWhenField
            value={when}
            labelledBy={whenLabelId}
            onChange={onWhenChange}
          />
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
          id={fromLabelId}
          htmlFor="route-from"
          className="mb-1 block text-sm font-medium tracking-wide text-on-surface-variant uppercase"
        >
          {t("routes.from")}
        </label>
        <div className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2">
          <LocationOriginField
            value={fromText}
            onChange={(next) => {
              setFromText(next);
              setError(null);
            }}
            onPlaceSelect={(place) => {
              setError(null);
              void resolveSelectedPlace(place).then(setFrom);
            }}
            autoDetect={false}
            labelledBy={fromLabelId}
            inputId="route-from"
            placeholder={t("routes.fromPlaceholder")}
            inputClassName="text-base"
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <label
            id={toLabelId}
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
        <div
          className={cn(
            "rounded-lg border bg-surface px-3 py-2 transition-shadow",
            showToHighlight
              ? "border-primary bg-primary/5 ring-2 ring-primary/40 ring-offset-2 ring-offset-surface-bright"
              : "border-outline-variant/30",
          )}
        >
          <PlaceAutocomplete
            id="route-to"
            value={toText}
            onChange={setToText}
            onPlaceSelect={(place) => {
              void resolveSelectedPlace(place).then(setTo);
            }}
            placeholder={t("routes.toPlaceholder")}
            ariaLabelledBy={toLabelId}
            proximity={from ? { lat: from.lat, lon: from.lon } : null}
            inputClassName="text-base"
            autoFocus={showToHighlight}
          />
        </div>
        {showToHighlight ? (
          <p className="mt-1.5 text-sm text-primary" role="status">
            {t("routes.toNeededHint")}
          </p>
        ) : null}
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <div>
        <p className="mb-1.5 text-sm font-medium tracking-wide text-on-surface-variant uppercase">
          {t("routes.departureTimeLabel")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="route-departure-start"
              className="mb-1 block text-xs font-medium text-on-surface-variant"
            >
              {t("routes.departureStart")}
            </label>
            <select
              id="route-departure-start"
              value={departureStartHour == null ? "any" : String(departureStartHour)}
              onChange={(e) => onStartChange(e.target.value)}
              disabled={!isPro}
              className="w-full min-h-11 rounded-lg border border-outline-variant/30 bg-surface px-3 py-2.5 text-base text-on-surface disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="any">{t("routes.departureAny")}</option>
              {DEPARTURE_HOURS.map((h) => (
                <option key={h} value={h}>
                  {isPro
                    ? formatHourOption(h)
                    : t("routes.departureOptionPro", {
                        time: formatHourOption(h),
                      })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="route-departure-end"
              className="mb-1 block text-xs font-medium text-on-surface-variant"
            >
              {t("routes.departureEnd")}
            </label>
            <select
              id="route-departure-end"
              value={departureEndHour == null ? "any" : String(departureEndHour)}
              onChange={(e) => onEndChange(e.target.value)}
              disabled={!isPro}
              className="w-full min-h-11 rounded-lg border border-outline-variant/30 bg-surface px-3 py-2.5 text-base text-on-surface disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="any">{t("routes.departureAny")}</option>
              {DEPARTURE_HOURS.map((h) => (
                <option key={h} value={h}>
                  {isPro
                    ? formatHourOption(h)
                    : t("routes.departureOptionPro", {
                        time: formatHourOption(h),
                      })}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!isPro ? (
          <p className="mt-1.5 text-xs text-on-surface-variant">
            {t("routes.departureProNote")}{" "}
            <Link href="/pro" className="font-medium text-primary underline-offset-2 hover:underline">
              {t("routes.departureUpgrade")}
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
