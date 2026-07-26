"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlaceDto, TravelMode } from "@/lib/types";
import { DEFAULT_TRAVEL_MODE, isTravelMode } from "@/lib/types";
import { PlaceAutocomplete } from "@/components/discover/place-autocomplete";
import { TravelModeSelector } from "@/components/travel/travel-mode-selector";
import { useI18n } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function RouteEndpointsForm({
  initialFrom,
  initialTo,
  fromPlace,
  toPlace,
  initialMode = DEFAULT_TRAVEL_MODE,
}: {
  initialFrom: string;
  initialTo: string;
  fromPlace?: PlaceDto;
  toPlace?: PlaceDto;
  initialMode?: TravelMode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fromText, setFromText] = useState(initialFrom);
  const [toText, setToText] = useState(initialTo);
  const [from, setFrom] = useState<PlaceDto | null>(fromPlace ?? null);
  const [to, setTo] = useState<PlaceDto | null>(toPlace ?? null);
  const [mode, setMode] = useState<TravelMode>(
    isTravelMode(initialMode) ? initialMode : DEFAULT_TRAVEL_MODE,
  );
  const [error, setError] = useState<string | null>(null);

  function applyRoute(nextMode: TravelMode = mode) {
    if (!from || !to) {
      setError(t("routes.pickBoth"));
      return;
    }
    setError(null);
    const params = new URLSearchParams();
    params.set("from", from.placeName);
    params.set("to", to.placeName);
    params.set("origin", from.placeName);
    params.set("lat", String(from.lat));
    params.set("lon", String(from.lon));
    params.set("fromLat", String(from.lat));
    params.set("fromLon", String(from.lon));
    params.set("toLat", String(to.lat));
    params.set("toLon", String(to.lon));
    params.set("mode", nextMode);
    startTransition(() => {
      router.push(`/routes?${params.toString()}`);
    });
  }

  function onModeChange(next: TravelMode) {
    setMode(next);
    if (from && to) {
      applyRoute(next);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
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
            onPlaceSelect={setFrom}
            placeholder={t("routes.fromPlaceholder")}
            ariaLabel={t("routes.from")}
            proximity={from ? { lat: from.lat, lon: from.lon } : null}
            inputClassName="text-base"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="route-to"
          className="mb-1 block text-sm font-medium tracking-wide text-on-surface-variant uppercase"
        >
          {t("routes.to")}
        </label>
        <div className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2">
          <PlaceAutocomplete
            id="route-to"
            value={toText}
            onChange={setToText}
            onPlaceSelect={setTo}
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

      <button
        type="button"
        onClick={() => applyRoute()}
        disabled={pending}
        className={cn(
          "flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-base font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container",
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
