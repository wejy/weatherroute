"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaceDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";
import { PlaceAutocomplete } from "@/components/discover/place-autocomplete";

type LocStatus =
  | "idle"
  | "coarse"
  | "locating"
  | "ready"
  | "denied"
  | "error";

export type GeoDetectMeta = {
  mode: "coarse" | "precise";
  suggestedDistance?: "region" | "continent";
  region?: string;
};

export function LocationOriginField({
  value,
  onChange,
  onPlaceSelect,
  onGeolocated,
  autoDetect = true,
}: {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceDto | null) => void;
  /** Fired when coarse region or precise GPS succeeds. */
  onGeolocated?: (place: PlaceDto, meta: GeoDetectMeta) => void;
  autoDetect?: boolean;
}) {
  const { t } = useI18n();
  const detectedOnce = useRef(false);
  const [status, setStatus] = useState<LocStatus>("idle");
  const [coarseActive, setCoarseActive] = useState(false);
  const [proximity, setProximity] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  /** IP / edge / timezone — no browser permission prompt. */
  const detectCoarseRegion = useCallback(async () => {
    setStatus("coarse");
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(
        `/api/geo/coarse?tz=${encodeURIComponent(tz || "")}`,
      );
      if (!res.ok) throw new Error("coarse failed");
      const data = (await res.json()) as {
        place: PlaceDto;
        suggestedDistance?: "region" | "continent";
        region?: string;
      };
      if (!data.place?.lat || !data.place?.lon) throw new Error("no place");

      onChange(data.place.placeName);
      onPlaceSelect(data.place);
      setProximity({ lat: data.place.lat, lon: data.place.lon });
      onGeolocated?.(data.place, {
        mode: "coarse",
        suggestedDistance: data.suggestedDistance,
        region: data.region,
      });
      setCoarseActive(true);
      setStatus("ready");
    } catch {
      setStatus("error");
      setCoarseActive(false);
    }
  }, [onChange, onPlaceSelect, onGeolocated]);

  /** Precise GPS — only when the user asks. */
  const detectPreciseLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("locating");
    setCoarseActive(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/geocode/reverse?lat=${latitude}&lon=${longitude}`,
          );
          if (!res.ok) throw new Error("reverse failed");
          const data = (await res.json()) as { place: PlaceDto };
          onChange(data.place.placeName);
          onPlaceSelect(data.place);
          setProximity({ lat: data.place.lat, lon: data.place.lon });
          onGeolocated?.(data.place, { mode: "precise" });
          setStatus("ready");
        } catch {
          setStatus("error");
        }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }, [onChange, onPlaceSelect, onGeolocated]);

  useEffect(() => {
    if (!autoDetect || detectedOnce.current) return;
    detectedOnce.current = true;
    void detectCoarseRegion();
  }, [autoDetect, detectCoarseRegion]);

  const busy = status === "locating" || status === "coarse";
  const hint =
    status === "coarse"
      ? t("location.detectingCoarse")
      : status === "locating"
        ? t("location.detecting")
        : status === "denied"
          ? t("location.denied")
          : status === "error"
            ? t("location.failed")
            : coarseActive
              ? t("location.coarseHint")
              : null;

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void detectPreciseLocation()}
          disabled={busy}
          title={t("location.useMyLocation")}
          aria-label={t("location.useMyLocation")}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:text-primary",
            busy && "animate-pulse text-primary",
            status === "ready" && !coarseActive && "text-secondary",
            coarseActive && "text-primary",
            (status === "denied" || status === "error") && "text-outline",
            status === "idle" && "text-secondary",
          )}
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            my_location
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <PlaceAutocomplete
            id="origin-location-input"
            value={value}
            onChange={(next) => {
              onChange(next);
              setCoarseActive(false);
            }}
            onPlaceSelect={(place) => {
              onPlaceSelect(place);
              if (place) {
                setProximity({ lat: place.lat, lon: place.lon });
                setCoarseActive(false);
                setStatus("ready");
              }
            }}
            proximity={proximity}
            placeholder={
              status === "coarse"
                ? t("location.detectingCoarse")
                : status === "locating"
                  ? t("location.detecting")
                  : t("location.placeholder")
            }
            ariaLabel={t("location.placeholder")}
          />
        </div>
      </div>

      {hint && (
        <p className="mt-1 text-left text-xs text-on-surface-variant">{hint}</p>
      )}
    </div>
  );
}
