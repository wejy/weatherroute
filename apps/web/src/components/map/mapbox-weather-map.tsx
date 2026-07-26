"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { cn, formatTemp } from "@/lib/utils";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { circlePolygon, type WeatherMapProps } from "@/components/map/geo";
import { destinationHref } from "@/lib/discover-query";
import { useI18n } from "@/components/i18n/locale-provider";
import { tempSeriesBarsHtml } from "@/components/map/map-nearby-card";
import type { MapMarkerDto } from "@/lib/types";
import type { Translator } from "@/i18n/translate";

const STYLE = "mapbox://styles/mapbox/light-v11";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markerPopupHtml(
  marker: MapMarkerDto,
  t: Translator,
  href: string,
): string {
  if (marker.id.startsWith("origin-")) {
    return `<strong>${escapeHtml(marker.name)}</strong>`;
  }

  const rows: string[] = [
    `<strong style="font-size:15px">${escapeHtml(marker.name)}</strong>`,
  ];

  if (marker.distanceKm != null) {
    rows.push(
      `<div style="opacity:.7;margin-top:4px;font-size:12px">${escapeHtml(
        t("map.hoverAway", {
          km: Math.round(marker.distanceKm),
          duration: marker.driveDurationLabel || "",
        }),
      )}</div>`,
    );
  }

  if (marker.tomorrowTempC != null) {
    rows.push(
      `<div style="margin-top:6px;font-size:13px">${escapeHtml(
        t("map.hoverNow", { temp: formatTemp(marker.tomorrowTempC) }),
      )}</div>`,
    );
  }

  if (marker.tempMinC != null && marker.tempMaxC != null) {
    rows.push(
      `<div style="font-size:13px;font-weight:600">${escapeHtml(
        t("map.hoverForecast", {
          label: marker.dateRangeLabel || t("card.forecast"),
          min: formatTemp(marker.tempMinC),
          max: formatTemp(marker.tempMaxC),
        }),
      )}</div>`,
    );
  }

  if (marker.conditionLabel) {
    rows.push(
      `<div style="opacity:.75;font-size:12px;margin-top:2px">${escapeHtml(marker.conditionLabel)}</div>`,
    );
  }

  if (marker.rainProbability != null) {
    rows.push(
      `<div style="margin-top:6px;font-size:12px">${escapeHtml(
        t("map.hoverRain", { pct: marker.rainProbability }),
      )}</div>`,
    );
  }

  if (marker.precipitationMm != null) {
    rows.push(
      `<div style="font-size:12px;opacity:.8">${escapeHtml(
        t("map.hoverRainMm", { mm: marker.precipitationMm }),
      )}</div>`,
    );
  }

  if (marker.sunshineScore != null) {
    rows.push(
      `<div style="font-size:12px;opacity:.8">${escapeHtml(
        t("map.hoverSun", { score: marker.sunshineScore }),
      )}</div>`,
    );
  }

  if (marker.tempSeries && marker.tempSeries.length >= 2) {
    rows.push(
      `<div style="margin-top:8px;font-size:10px;font-weight:600;color:#464555;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(
        t("map.hoverTempChart"),
      )}</div>
      ${tempSeriesBarsHtml(marker.tempSeries)}`,
    );
  }

  rows.push(
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:10px;font-size:13px;font-weight:600;color:#3525cd;text-decoration:underline">${escapeHtml(
      t("map.openDestination"),
    )}</a>`,
  );

  return `<div style="min-width:168px;max-width:240px;line-height:1.35">${rows.join("")}</div>`;
}

function canHoverPreview(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function MapboxWeatherMap({
  markers,
  origin,
  radiusKm = 300,
  showRadius = true,
  className,
  token,
  locationQuery,
}: WeatherMapProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const locationQueryRef = useRef(locationQuery);
  locationQueryRef.current = locationQuery;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!containerRef.current || !token) return;

    mapboxgl.accessToken = token;

    const center: [number, number] = origin
      ? [origin.lon, origin.lat]
      : [26.0, 64.0]; // mid-Finland fallback while GPS resolves (not Helsinki)

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE,
      center,
      zoom: origin ? 6 : 4.5,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      if (showRadius && origin && radiusKm < 15000) {
        const circle = circlePolygon(origin.lon, origin.lat, radiusKm);
        map.addSource("search-radius", {
          type: "geojson",
          data: circle,
        });
        map.addLayer({
          id: "search-radius-fill",
          type: "fill",
          source: "search-radius",
          paint: {
            "fill-color": "#3525cd",
            "fill-opacity": 0.08,
          },
        });
        map.addLayer({
          id: "search-radius-line",
          type: "line",
          source: "search-radius",
          paint: {
            "line-color": "#3525cd",
            "line-width": 2,
            "line-opacity": 0.55,
          },
        });

        const bounds = new mapboxgl.LngLatBounds();
        for (const c of circle.geometry.coordinates[0]!) {
          bounds.extend(c as [number, number]);
        }
        map.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 0 });
      } else if (origin) {
        map.setCenter([origin.lon, origin.lat]);
        map.setZoom(radiusKm >= 15000 ? 2 : 5);
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token, origin?.lat, origin?.lon, radiusKm, showRadius]);

  // Sync marker pins when data changes (without recreating the map).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      for (const marker of markers) {
        const isOrigin = marker.id.startsWith("origin-");
        const el = document.createElement("button");
        el.type = "button";
        el.className = "weathertrip-map-marker";
        el.setAttribute(
          "aria-label",
          isOrigin
            ? `${marker.name}`
            : `${marker.name}, ${Math.round(marker.temperatureC)}C`,
        );
        el.style.cursor = "pointer";
        el.style.border = "none";
        el.style.background = "transparent";
        el.style.padding = "0";
        el.style.minWidth = "44px";
        el.style.minHeight = "32px";

        el.innerHTML = isOrigin
          ? `<div style="background:#3525cd;color:#fff;border-radius:999px;padding:8px 12px;font:600 12px/1 Inter,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.18);border:2px solid #fff;">●</div>`
          : `<div style="display:flex;align-items:center;gap:4px;background:rgba(252,248,255,.98);border-radius:999px;padding:8px 12px;font:600 13px/1 Inter,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.12);border:1px solid rgba(199,196,216,.5);color:#1b1b24;">
              <span>${Math.round(marker.temperatureC)}°</span>
            </div>`;

        const href = destinationHref(marker.id, locationQueryRef.current);
        const popup = new mapboxgl.Popup({
          offset: 16,
          closeButton: true,
          closeOnClick: true,
          maxWidth: "260px",
        }).setHTML(markerPopupHtml(marker, tRef.current, href));

        const m = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([marker.lon, marker.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isOrigin) return;
          // Touch / click: open popup with temp chart (don't navigate away).
          if (!m.getPopup()?.isOpen()) m.togglePopup();
        });

        if (!isOrigin && canHoverPreview()) {
          el.addEventListener("mouseenter", () => {
            if (!m.getPopup()?.isOpen()) m.togglePopup();
          });
          el.addEventListener("mouseleave", () => {
            if (m.getPopup()?.isOpen()) m.togglePopup();
          });
        }

        markersRef.current.push(m);
      }
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);
  }, [markers]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {showRadius && radiusKm < 15000 && (
        <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-full border border-primary/20 bg-surface/90 px-3 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-md">
          {radiusKm.toLocaleString()} km radius
        </div>
      )}
      {/* Keep marker list accessible for no-JS / SEO fallback links */}
      <ul className="sr-only">
        {markers.map((m) => (
          <li key={m.id}>
            <Link
              href={
                m.id.startsWith("origin-")
                  ? "/#"
                  : destinationHref(m.id, locationQuery)
              }
            >
              {m.name} {formatTemp(m.temperatureC)}
              <span className={weatherIconClass(m.condition)}>
                {weatherIcon(m.condition)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
