"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MapMarkerDto } from "@/lib/types";
import { travelModeIcon } from "@/lib/types";
import { formatTemp, cn } from "@/lib/utils";
import { formatDistanceKm } from "@/lib/distance";
import { TempSparkline } from "@/components/map/map-nearby-card";
import { useI18n } from "@/components/i18n/locale-provider";
import { translateCondition } from "@/i18n/translate";
import {
  fetchWikipediaSummary,
  getCachedWikipedia,
  wikipediaCacheKey,
  type WikipediaSummaryClient,
} from "@/lib/wikipedia-client";
import { buildWeatherAdvisories } from "@/lib/weather-advisories";

export type { WikipediaSummaryClient };

function truncate(text: string, max = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max).trim()}…`;
}

/**
 * Pinned map marker info card: weather + Wikipedia image/extract/link.
 * `dense` = mobile-friendly shorter layout (bottom sheet / limited height).
 */
export function MapMarkerPopup({
  marker,
  href,
  onClose,
  className,
  dense = false,
}: {
  marker: MapMarkerDto;
  href: string;
  onClose: () => void;
  className?: string;
  dense?: boolean;
}) {
  const { t, locale, dict } = useI18n();
  const lang = locale === "fi" ? "fi" : "en";
  const cacheKey = wikipediaCacheKey(marker.name, marker.lat, marker.lon, lang);
  const cached = getCachedWikipedia(cacheKey);

  const [wiki, setWiki] = useState<WikipediaSummaryClient | null>(
    cached?.status === "ready" ? cached.summary : null,
  );
  const [wikiStatus, setWikiStatus] = useState<"loading" | "ready" | "empty">(
    cached?.status === "ready"
      ? "ready"
      : cached?.status === "empty"
        ? "empty"
        : "loading",
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const hit = getCachedWikipedia(cacheKey);
    if (hit?.status === "ready") {
      setWiki(hit.summary);
      setWikiStatus("ready");
      return;
    }
    if (hit?.status === "empty") {
      setWiki(null);
      setWikiStatus("empty");
      return;
    }

    setWiki(null);
    setWikiStatus("loading");

    void fetchWikipediaSummary({
      name: marker.name,
      lat: marker.lat,
      lon: marker.lon,
      lang,
    }).then((summary) => {
      if (cancelled) return;
      if (summary) {
        setWiki(summary);
        setWikiStatus("ready");
      } else {
        setWikiStatus("empty");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, marker.name, marker.lat, marker.lon, lang]);

  const advisories = buildWeatherAdvisories(
    {
      rainProbability: marker.rainProbability ?? 0,
      precipitationMm: marker.precipitationMm,
      condition: marker.condition,
      temperatureC: marker.tempMaxC ?? marker.temperatureC,
    },
    t,
  );

  return (
    <article
      role="region"
      aria-label={marker.name}
      className={cn(
        "overflow-hidden rounded-xl border border-outline-variant/30 bg-surface shadow-[0px_12px_36px_rgba(0,0,0,0.18)]",
        dense ? "w-full max-w-none" : "w-[min(300px,calc(100vw-2rem))]",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={cn("relative", dense && "flex gap-3 px-3 pt-3")}>
        {wiki?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Wikimedia thumbs
          <img
            src={wiki.thumbnailUrl}
            alt=""
            className={cn(
              "object-cover",
              dense
                ? "h-16 w-16 shrink-0 rounded-lg"
                : "h-36 w-full",
            )}
          />
        ) : !dense ? (
          <div className="flex h-24 w-full items-center justify-center bg-surface-container text-sm text-on-surface-variant">
            {wikiStatus === "loading"
              ? t("map.wikipediaLoading")
              : t("map.wikipediaNoImage")}
          </div>
        ) : null}

        <div className={cn(dense ? "min-w-0 flex-1 pr-10" : "contents")}>
          {dense ? (
            <>
              <h2 className="m-0 truncate text-base leading-tight font-semibold text-on-surface">
                {marker.name}
              </h2>
              <p className="mt-0.5 truncate text-sm text-on-surface-variant">
                {formatTemp(marker.temperatureC)}C
                {marker.condition
                  ? ` · ${translateCondition(dict, marker.condition)}`
                  : ""}
                {marker.distanceKm != null
                  ? ` · ${formatDistanceKm(marker.distanceKm, locale)}`
                  : ""}
              </p>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("map.closePopup")}
          className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/30 bg-surface/95 text-on-surface shadow-sm backdrop-blur-md transition-colors hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            close
          </span>
        </button>
      </div>

      <div className={cn("space-y-2", dense ? "p-3 pt-2" : "space-y-2.5 p-3.5")}>
        {!dense ? (
          <div>
            <h2 className="m-0 text-lg leading-tight font-semibold text-on-surface">
              {marker.name}
            </h2>
            {wiki?.description && (
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {wiki.description}
              </p>
            )}
          </div>
        ) : null}

        {!dense && marker.distanceKm != null && (
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-on-surface-variant">
            <span>{formatDistanceKm(marker.distanceKm, locale)}</span>
            {marker.driveDurationLabel ? (
              <span className="inline-flex items-center gap-0.5">
                <span aria-hidden="true">·</span>
                <span
                  className="material-symbols-outlined text-[16px]"
                  aria-hidden="true"
                >
                  {travelModeIcon(marker.travelMode)}
                </span>
                ~{marker.driveDurationLabel}
              </span>
            ) : null}
          </p>
        )}

        <div
          className={cn(
            "text-on-surface",
            dense ? "flex flex-wrap gap-x-3 gap-y-0.5 text-xs" : "space-y-0.5 text-sm",
          )}
        >
          {marker.tempMinC != null && marker.tempMaxC != null && (
            <p className={dense ? "font-semibold" : "font-semibold"}>
              {t("map.hoverForecast", {
                label: marker.dateRangeLabel || t("card.forecast"),
                min: formatTemp(marker.tempMinC),
                max: formatTemp(marker.tempMaxC),
              })}
            </p>
          )}
          {marker.rainProbability != null && (
            <p className="text-on-surface-variant">
              {t("map.hoverRain", { pct: marker.rainProbability })}
              {marker.precipitationMm != null
                ? ` · ${t("map.hoverRainMm", { mm: marker.precipitationMm })}`
                : ""}
            </p>
          )}
          {!dense && marker.tomorrowTempC != null && (
            <p>
              {t("map.hoverNow", {
                temp: formatTemp(marker.tomorrowTempC),
              })}
            </p>
          )}
          {!dense && marker.condition && (
            <p className="text-on-surface-variant">
              {translateCondition(dict, marker.condition)}
            </p>
          )}
        </div>

        {advisories.length > 0 ? (
          <ul
            className={cn(
              "border-t border-outline-variant/20",
              dense ? "space-y-1 pt-1.5" : "space-y-1.5 pt-2",
            )}
          >
            {(dense ? advisories.slice(0, 1) : advisories).map((a) => (
              <li key={a.id} className="flex gap-2 text-xs">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    a.tone === "warning" ? "text-error" : "text-amber-600"
                  }`}
                  aria-hidden
                >
                  {a.icon}
                </span>
                <span>
                  <span
                    className={`font-semibold ${
                      a.tone === "warning" ? "text-error" : "text-on-surface"
                    }`}
                  >
                    {a.title}
                  </span>
                  {!dense ? (
                    <span className="mt-0.5 block text-on-surface-variant">
                      {a.description}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {!dense && wikiStatus === "loading" && (
          <p className="text-xs text-on-surface-variant">
            {t("map.wikipediaLoading")}
          </p>
        )}
        {!dense && wikiStatus === "ready" && wiki && (
          <p className="text-sm leading-snug text-on-surface-variant">
            {truncate(wiki.extract)}
          </p>
        )}
        {!dense && wikiStatus === "empty" && (
          <p className="text-xs text-on-surface-variant">
            {t("map.wikipediaUnavailable")}
          </p>
        )}

        {!dense && marker.tempSeries && marker.tempSeries.length >= 2 && (
          <div className="rounded-lg border border-outline-variant/20 bg-surface-container/50 px-2 py-2">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
              {t("map.hoverTempChart")}
            </p>
            <TempSparkline
              values={marker.tempSeries}
              labels={marker.tempDayLabels}
              height={60}
            />
          </div>
        )}

        <div className={cn("flex flex-wrap gap-2", dense ? "pt-0" : "pt-1")}>
          {!dense && wiki?.pageUrl && (
            <a
              href={wiki.pageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
            >
              {t("map.wikipediaLink")}
            </a>
          )}
          <Link
            href={href}
            className={cn(
              "inline-flex items-center rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container",
              dense ? "min-h-11 flex-1 justify-center" : "min-h-10",
            )}
          >
            {t("map.openDestination")}
          </Link>
        </div>
      </div>
    </article>
  );
}
