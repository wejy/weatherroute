"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl,
  weatherTripRouteSharePath,
  type LatLon,
  type PlaceRef,
} from "@/lib/route-share";
import type { TravelMode } from "@/lib/types";

export type RouteSharePayload = {
  fromName: string;
  toName: string;
  origin: PlaceRef;
  destination: PlaceRef;
  waypoints?: LatLon[];
  mode?: TravelMode | string | null;
  bestDeparture?: string | null;
  datePreset?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  fromId?: string | null;
  toId?: string | null;
  /** Compact layout for trip cards */
  compact?: boolean;
};

export function RouteShareActions(props: RouteSharePayload) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onShareRoute = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const modeLabel =
        props.mode === "cycling" ? t("travel.cycling") : t("travel.driving");
      const path = weatherTripRouteSharePath({
        from: props.fromName,
        to: props.toName,
        fromLat:
          typeof props.origin === "object" ? props.origin.lat : undefined,
        fromLon:
          typeof props.origin === "object" ? props.origin.lon : undefined,
        toLat:
          typeof props.destination === "object"
            ? props.destination.lat
            : undefined,
        toLon:
          typeof props.destination === "object"
            ? props.destination.lon
            : undefined,
        fromId: props.fromId,
        toId: props.toId,
        mode: props.mode,
        datePreset: props.datePreset,
        startDate: props.startDate,
        endDate: props.endDate,
      });
      const url = `${window.location.origin}${path}`;
      const departure = props.bestDeparture?.trim();
      const text = departure
        ? t("routes.shareTextWithDeparture", {
            from: props.fromName,
            to: props.toName,
            mode: modeLabel,
            time: departure,
          })
        : t("routes.shareText", {
            from: props.fromName,
            to: props.toName,
            mode: modeLabel,
          });

      if (navigator.share) {
        await navigator.share({
          title: t("routes.shareTitle"),
          text,
          url,
        });
        setMessage(t("routes.shareDone"));
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setMessage(t("routes.shareCopied"));
      } else {
        setMessage(url);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessage(t("routes.shareError"));
    } finally {
      setBusy(false);
    }
  }, [props, t]);

  const gmapsHref = googleMapsDirectionsUrl({
    origin: props.origin,
    destination: props.destination,
    waypoints: props.waypoints,
    mode: props.mode,
  });
  const amapsHref = appleMapsDirectionsUrl({
    origin: props.origin,
    destination: props.destination,
    waypoints: props.waypoints,
    mode: props.mode,
  });

  const btnBase = props.compact
    ? "inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
    : "flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container";

  /** Google brand gradient + dark scrim so white label meets WCAG AA (~4.5:1). */
  const mapsLinkBtn = props.compact
    ? "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition-[filter,box-shadow] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    : "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-[filter,box-shadow] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  const gmapsGradientStyle = {
    backgroundImage:
      "linear-gradient(rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.48)), linear-gradient(105deg, #4285F4 0%, #EA4335 34%, #FBBC05 66%, #34A853 100%)",
  } as const;

  /** Apple brand (Mobbin): Science Blue → Shark. White text on these meets WCAG AA. */
  const amapsGradientStyle = {
    backgroundImage:
      "linear-gradient(105deg, #0066CC 0%, #1D1D1F 72%, #1D1D1F 100%)",
  } as const;

  return (
    <div className={cn("space-y-2", props.compact && "space-y-0")}>
      <div
        className={cn(
          props.compact ? "flex flex-wrap gap-2" : "flex flex-col gap-2",
        )}
      >
        <button
          type="button"
          onClick={() => void onShareRoute()}
          disabled={busy}
          className={cn(btnBase, busy && "opacity-70")}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            ios_share
          </span>
          {busy ? t("routes.sharing") : t("routes.shareRoute")}
        </button>
        <a
          href={gmapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(mapsLinkBtn, "focus-visible:outline-[#4285F4]")}
          style={gmapsGradientStyle}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            map
          </span>
          {t("routes.shareGoogleMaps")}
        </a>
        <a
          href={amapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(mapsLinkBtn, "focus-visible:outline-[#0066CC]")}
          style={amapsGradientStyle}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            map
          </span>
          {t("routes.shareAppleMaps")}
        </a>
      </div>
      {message ? (
        <p className="text-xs text-on-surface-variant" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
