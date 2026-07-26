"use client";

import Link from "next/link";
import type { MapMarkerDto, PlaceDto } from "@/lib/types";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp, cn } from "@/lib/utils";
import { destinationHref } from "@/lib/discover-query";
import { useI18n } from "@/components/i18n/locale-provider";
import { TempSparkline } from "@/components/map/map-nearby-card";

/** Project lat/lon into map % coords relative to origin + radius circle. */
function project(
  lat: number,
  lon: number,
  origin: PlaceDto,
  radiusKm: number,
): { left: number; top: number } {
  // Approx degrees for the visible circle (pad so markers stay inside frame)
  const pad = 1.15;
  const latSpan = Math.max((radiusKm / 111) * pad, 0.8);
  const lonSpan = Math.max(
    (radiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180))) * pad,
    0.8,
  );

  const x = 0.5 + (lon - origin.lon) / (2 * lonSpan);
  const y = 0.5 - (lat - origin.lat) / (2 * latSpan);

  return {
    left: Math.min(92, Math.max(8, x * 100)),
    top: Math.min(90, Math.max(10, y * 100)),
  };
}

/** CSS mock map — swaps for Mapbox GL when NEXT_PUBLIC_MAPBOX_TOKEN is set. */
export function MockMap({
  markers,
  className,
  showRadius,
  origin,
  radiusKm = 300,
  locationQuery,
}: {
  markers: MapMarkerDto[];
  className?: string;
  showRadius?: boolean;
  origin?: PlaceDto;
  radiusKm?: number;
  locationQuery?: {
    origin?: string;
    lat?: number;
    lon?: number;
  };
}) {
  const { t } = useI18n();
  const center = origin ?? {
    id: "center",
    name: "Center",
    placeName: "Center",
    lat: 60.17,
    lon: 24.94,
  };

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[#dfe9f5]",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, #c5d8ef 0%, transparent 55%),
            radial-gradient(circle at 70% 60%, #b8d4c8 0%, transparent 35%),
            linear-gradient(135deg, #e8f1f8 0%, #d4e4f5 45%, #cfe0d8 100%)
          `,
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#777587"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {showRadius && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex aspect-square h-[min(72vw,460px)] w-[min(72vw,460px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary/35 bg-primary/5">
          <div className="h-4 w-4 rounded-full border-2 border-surface bg-primary shadow-[0_0_15px_rgba(53,37,205,0.5)]" />
          <div className="absolute top-4 rounded-full border border-primary/20 bg-surface/80 px-3 py-1 text-sm font-medium text-primary shadow-sm backdrop-blur-sm">
            {radiusKm >= 10000
              ? "Global"
              : `${radiusKm.toLocaleString()} km radius`}
          </div>
        </div>
      )}

      {markers.map((marker) => {
        const { left, top } = project(
          marker.lat,
          marker.lon,
          center,
          radiusKm,
        );
        const isOrigin = marker.id.startsWith("origin-");

        return (
          <Link
            key={marker.id}
            href={
              isOrigin
                ? "/#"
                : destinationHref(marker.id, locationQuery)
            }
            aria-label={
              isOrigin
                ? `${marker.name} (origin)`
                : `${marker.name}, ${formatTemp(marker.temperatureC)}`
            }
            className="group absolute z-20 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center transition-all hover:z-30 focus-visible:z-30"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div
              className={cn(
                "mb-1 flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg backdrop-blur-md transition-transform group-hover:scale-105 group-focus-visible:scale-105",
                isOrigin
                  ? "border-primary/40 bg-primary text-on-primary"
                  : "border-outline-variant/30 bg-surface/95",
              )}
            >
              {!isOrigin && (
                <>
                  <span className="text-xl font-semibold text-on-surface" aria-hidden="true">
                    {formatTemp(marker.temperatureC)}
                  </span>
                  <span
                    className={`material-symbols-outlined fill-icon text-lg ${weatherIconClass(marker.condition)}`}
                    aria-hidden="true"
                  >
                    {weatherIcon(marker.condition)}
                  </span>
                </>
              )}
              {isOrigin && (
                <span className="text-sm font-semibold" aria-hidden="true">
                  ●
                </span>
              )}
            </div>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-xl border border-outline-variant/25 bg-surface/95 p-3 text-left opacity-0 shadow-[0px_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-opacity [@media(hover:hover)_and_(pointer:fine)]:block [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-visible:opacity-100">
              <p className="text-sm font-semibold text-on-surface">
                {marker.name}
              </p>
              {!isOrigin && (
                <div className="mt-1 space-y-0.5 text-[12px] leading-snug text-on-surface-variant">
                  {marker.distanceKm != null && (
                    <p>
                      {t("map.hoverAway", {
                        km: Math.round(marker.distanceKm),
                        duration: marker.driveDurationLabel || "",
                      })}
                    </p>
                  )}
                  {marker.tomorrowTempC != null && (
                    <p>
                      {t("map.hoverNow", {
                        temp: formatTemp(marker.tomorrowTempC),
                      })}
                    </p>
                  )}
                  {marker.tempMinC != null && marker.tempMaxC != null && (
                    <p className="font-semibold text-on-surface">
                      {t("map.hoverForecast", {
                        label: marker.dateRangeLabel || t("card.forecast"),
                        min: formatTemp(marker.tempMinC),
                        max: formatTemp(marker.tempMaxC),
                      })}
                    </p>
                  )}
                  {marker.conditionLabel && <p>{marker.conditionLabel}</p>}
                  {marker.rainProbability != null && (
                    <p>
                      {t("map.hoverRain", { pct: marker.rainProbability })}
                    </p>
                  )}
                  {marker.precipitationMm != null && (
                    <p>
                      {t("map.hoverRainMm", { mm: marker.precipitationMm })}
                    </p>
                  )}
                  {marker.sunshineScore != null && (
                    <p>
                      {t("map.hoverSun", { score: marker.sunshineScore })}
                    </p>
                  )}
                  {marker.tempSeries && marker.tempSeries.length >= 2 && (
                    <div className="mt-1">
                      <p className="text-[10px] font-medium tracking-wide uppercase">
                        {t("map.hoverTempChart")}
                      </p>
                      <TempSparkline
                        values={marker.tempSeries}
                        height={48}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Link>
        );
      })}

      <div className="absolute right-4 bottom-4 z-20 rounded-xl border border-outline-variant/20 bg-surface/90 px-3 py-2 text-xs font-medium text-on-surface-variant shadow-sm backdrop-blur-md">
        Mock map · circle = search radius from start
      </div>
    </div>
  );
}
