"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { DestinationDto } from "@/lib/types";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { formatDistanceKm } from "@/lib/distance";
import { useI18n } from "@/components/i18n/locale-provider";
import { translateCondition } from "@/i18n/translate";
import { resolveDateWindow, type DatePreset } from "@/lib/dates";
import { destinationHref } from "@/lib/discover-query";

const LOCAL_FALLBACK = "/images/naantali.jpg";

function isRemoteImage(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function DestinationCard({
  destination,
  datePreset,
  startDate,
  endDate,
  distance,
  radiusKm,
  weatherGoal,
  origin,
  lat,
  lon,
  mode,
}: {
  destination: DestinationDto;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
  distance?: string;
  radiusKm?: number | string;
  weatherGoal?: string;
  origin?: string;
  lat?: number;
  lon?: number;
  mode?: string;
}) {
  const { t, dict, locale } = useI18n();
  const forecast = destination.forecast;
  const current = destination.current;
  const dateLabel = resolveDateWindow({
    preset: (forecast.preset as DatePreset) || "custom",
    startDate: forecast.startDate,
    endDate: forecast.endDate,
    locale,
  }).label;
  const [imageSrc, setImageSrc] = useState(destination.imageUrl);

  useEffect(() => {
    setImageSrc(destination.imageUrl);
  }, [destination.id, destination.imageUrl]);

  const remote = isRemoteImage(imageSrc);

  return (
    <Link
      href={destinationHref(destination.slug, {
        datePreset: datePreset ?? forecast.preset ?? "custom",
        startDate: startDate ?? forecast.startDate,
        endDate: endDate ?? forecast.endDate,
        distance,
        radiusKm,
        weatherGoal,
        origin,
        lat,
        lon,
        mode,
      })}
    >
      <article className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_10px_30px_rgba(0,0,0,0.08)]">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container">
          <Image
            key={imageSrc}
            src={imageSrc}
            alt={destination.placeName}
            fill
            unoptimized={remote}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            onError={() => {
              if (imageSrc !== LOCAL_FALLBACK) setImageSrc(LOCAL_FALLBACK);
            }}
          />
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-outline-variant/10 bg-surface/90 px-3 py-1.5 shadow-sm backdrop-blur-md">
              <span
                className={`material-symbols-outlined fill-icon text-lg ${weatherIconClass(forecast.condition)}`}
                aria-hidden="true"
              >
                {weatherIcon(forecast.condition)}
              </span>
              <span className="text-sm font-semibold text-on-surface">
                {formatTemp(forecast.tempMinC)}–{formatTemp(forecast.tempMaxC)}
              </span>
            </div>
            <span className="rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-on-primary uppercase backdrop-blur-md">
              {dateLabel}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="mb-1 text-xl font-semibold text-on-surface">
              {destination.placeName}
            </h3>
            <p className="text-sm text-on-surface-variant">
              {translateCondition(dict, forecast.condition)} ·{" "}
              {t("card.rain", { pct: forecast.rainProbability })}
              {destination.distanceKm > 0 && (
                <span>
                  {" "}
                  · {formatDistanceKm(destination.distanceKm, locale)}
                </span>
              )}
              {destination.driveDurationLabel ? (
                <span className="inline-flex items-center gap-0.5">
                  {" · "}
                  <span
                    className="material-symbols-outlined text-[14px] align-middle"
                    aria-hidden="true"
                  >
                    {destination.travelMode === "cycling"
                      ? "directions_bike"
                      : "directions_car"}
                  </span>
                  {destination.driveDurationLabel}
                </span>
              ) : null}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-surface-container-low px-3 py-2">
              <p className="text-[11px] font-medium tracking-wide text-on-surface-variant uppercase">
                {t("card.now")}
              </p>
              <p className="mt-0.5 flex items-center gap-1 font-semibold text-on-surface">
                <span
                  className={`material-symbols-outlined text-base ${weatherIconClass(current.condition)}`}
                  aria-hidden="true"
                >
                  {weatherIcon(current.condition)}
                </span>
                {formatTemp(current.temperatureC)}C
              </p>
            </div>
            <div className="rounded-xl bg-secondary/10 px-3 py-2">
              <p className="text-[11px] font-medium tracking-wide text-secondary uppercase">
                {t("card.forecast")}
              </p>
              <p className="mt-0.5 flex items-center gap-1 font-semibold text-on-surface">
                <span
                  className={`material-symbols-outlined text-base ${weatherIconClass(forecast.condition)}`}
                  aria-hidden="true"
                >
                  {weatherIcon(forecast.condition)}
                </span>
                {formatTemp(forecast.tempMaxC)}C
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
