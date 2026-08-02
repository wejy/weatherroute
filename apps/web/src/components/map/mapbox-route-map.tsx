"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn, formatTemp } from "@/lib/utils";
import type { PlaceDto, RouteAlternativeDto, RouteWaypointDto } from "@/lib/types";
import { WEATHER_TONE_COLORS, worseTone, mapWeatherColor, isSevereMapAlert, SEVERE_ALERT_COLOR } from "@/lib/weather-tone";
import { weatherIcon } from "@/lib/weather-icons";
import { useI18n } from "@/components/i18n/locale-provider";

const STYLE = "mapbox://styles/mapbox/light-v11";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function lineCoordinates(
  from: PlaceDto,
  to: PlaceDto,
  waypoints: RouteWaypointDto[],
  geometry?: [number, number][],
): [number, number][] {
  if (geometry && geometry.length >= 2) return geometry;
  if (waypoints.length >= 2) {
    return waypoints.map((w) => [w.lon, w.lat]);
  }
  return [
    [from.lon, from.lat],
    [to.lon, to.lat],
  ];
}

function alternativesGeoJSON(
  alternatives: RouteAlternativeDto[] | undefined,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features = (alternatives ?? [])
    .filter((a) => !a.selected && a.geometry.length >= 2)
    .map((a) => ({
      type: "Feature" as const,
      properties: { index: a.index },
      geometry: {
        type: "LineString" as const,
        coordinates: a.geometry,
      },
    }));
  return { type: "FeatureCollection", features };
}

/** Split the route into segments colored by the worse tone of adjacent waypoints. */
function coloredSegmentsGeoJSON(
  coords: [number, number][],
  waypoints: RouteWaypointDto[],
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  if (waypoints.length < 2 || coords.length < 2) {
    const wp = waypoints[0];
    const color = wp
      ? mapWeatherColor(wp.tone, wp.condition, wp.advisories)
      : WEATHER_TONE_COLORS.clear;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { color },
          geometry: { type: "LineString", coordinates: coords },
        },
      ],
    };
  }

  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]!;
    const b = waypoints[i + 1]!;
    const tone = worseTone(a.tone, b.tone);
    const condition =
      a.condition === "storm" || b.condition === "storm"
        ? "storm"
        : a.condition;
    const color = mapWeatherColor(tone, condition, [
      ...a.advisories,
      ...b.advisories,
    ]);
    const t0 = i / (waypoints.length - 1);
    const t1 = (i + 1) / (waypoints.length - 1);
    const i0 = Math.max(
      0,
      Math.min(coords.length - 1, Math.round(t0 * (coords.length - 1))),
    );
    const i1 = Math.max(
      i0 + 1,
      Math.min(coords.length - 1, Math.round(t1 * (coords.length - 1))),
    );
    const slice = coords.slice(i0, i1 + 1);
    if (slice.length < 2) continue;
    features.push({
      type: "Feature",
      properties: { color },
      geometry: { type: "LineString", coordinates: slice },
    });
  }

  if (features.length === 0) {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { color: WEATHER_TONE_COLORS.clear },
          geometry: { type: "LineString", coordinates: coords },
        },
      ],
    };
  }

  return { type: "FeatureCollection", features };
}

function weatherMarkerEl(
  wp: RouteWaypointDto,
  selected: boolean,
): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "solviax-route-marker";
  const hasWarning = wp.advisories.some((a) => a.tone === "warning");
  const hasCaution = wp.advisories.length > 0;
  const severe = isSevereMapAlert(wp.condition, wp.advisories);
  el.setAttribute(
    "aria-label",
    `${wp.name}, ${Math.round(wp.temperatureC)}°, rain ${wp.rainProbability}%`,
  );
  el.style.border = "none";
  el.style.background = "transparent";
  el.style.padding = "0";
  el.style.cursor = "pointer";

  const border = mapWeatherColor(wp.tone, wp.condition, wp.advisories);
  const scale = selected ? "scale(1.08)" : "none";
  const badgeColor = severe
    ? SEVERE_ALERT_COLOR
    : hasWarning
      ? WEATHER_TONE_COLORS.warning
      : WEATHER_TONE_COLORS.caution;
  const warnBadge =
    hasWarning || hasCaution
      ? `<span style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:999px;background:${badgeColor};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:700 9px/1 system-ui,sans-serif;color:#fff;" aria-hidden="true">!</span>`
      : "";

  el.innerHTML = `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;transform:${scale};">
    <div style="position:relative;display:flex;align-items:center;gap:6px;background:rgba(252,248,255,.98);border-radius:14px;padding:8px 10px;font:600 12px/1.1 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.14);border:2px solid ${border};color:#1b1b24;white-space:nowrap;">
      <span style="font-size:15px;font-variant-numeric:tabular-nums;">${Math.round(wp.temperatureC)}°</span>
      <span style="width:1px;height:14px;background:rgba(0,0,0,.12);"></span>
      <span style="font-size:10px;font-weight:600;color:#5c5a6e;">${wp.rainProbability}%</span>
      ${warnBadge}
    </div>
    <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;font:600 10px/1.2 system-ui,sans-serif;color:#3d3b4a;background:rgba(255,255,255,.9);padding:2px 6px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.08);">${escapeHtml(wp.name)}</span>
  </div>`;
  return el;
}

export function MapboxRouteMap({
  from,
  to,
  waypoints,
  geometry,
  alternatives,
  token,
  className,
}: {
  from: PlaceDto;
  to: PlaceDto;
  waypoints: RouteWaypointDto[];
  geometry?: [number, number][];
  alternatives?: RouteAlternativeDto[];
  token: string;
  className?: string;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const waypointsRef = useRef(waypoints);
  waypointsRef.current = waypoints;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const geometryKey = geometry?.length
    ? `${geometry.length}:${geometry[0]?.join(",")}:${geometry[geometry.length - 1]?.join(",")}`
    : "straight";
  const altKey = (alternatives ?? [])
    .map((a) => `${a.index}:${a.selected}:${a.geometry.length}`)
    .join("|");

  const selected = selectedIdx != null ? waypoints[selectedIdx] : null;

  // Create map once per route geometry / endpoints.
  useEffect(() => {
    if (!containerRef.current || !token) return;

    mapboxgl.accessToken = token;
    setSelectedIdx(null);

    const coords = lineCoordinates(from, to, waypointsRef.current, geometry);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [(from.lon + to.lon) / 2, (from.lat + to.lat) / 2],
      zoom: 6,
      attributionControl: true,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("route-alts", {
        type: "geojson",
        data: alternativesGeoJSON(alternatives),
      });
      map.addLayer({
        id: "route-alts-casing",
        type: "line",
        source: "route-alts",
        paint: {
          "line-color": "#ffffff",
          "line-width": 7,
          "line-opacity": 0.95,
          "line-dasharray": [1.2, 1.2],
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
      map.addLayer({
        id: "route-alts",
        type: "line",
        source: "route-alts",
        paint: {
          "line-color": "#1b1b24",
          "line-width": 4,
          "line-opacity": 0.9,
          "line-dasharray": [1.5, 1.2],
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      map.addSource("route-segments", {
        type: "geojson",
        data: coloredSegmentsGeoJSON(coords, waypointsRef.current),
      });
      map.addLayer({
        id: "route-line-casing",
        type: "line",
        source: "route-segments",
        paint: {
          "line-color": "#ffffff",
          "line-width": 7,
          "line-opacity": 0.9,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route-segments",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
          "line-opacity": 0.95,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      const bounds = new mapboxgl.LngLatBounds();
      for (const c of coords) bounds.extend(c);
      for (const a of alternatives ?? []) {
        for (const c of a.geometry) bounds.extend(c);
      }
      map.fitBounds(bounds, { padding: 72, maxZoom: 10, duration: 0 });
    });

    map.on("click", () => setSelectedIdx(null));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on route identity only
  }, [
    token,
    from.id,
    from.lat,
    from.lon,
    to.id,
    to.lat,
    to.lon,
    geometryKey,
    altKey,
  ]);

  // Sync weather markers + segment colors when waypoints / selection change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      waypoints.forEach((wp, idx) => {
        const el = weatherMarkerEl(wp, selectedIdx === idx);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          setSelectedIdx((prev) => (prev === idx ? null : idx));
        });
        const m = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([wp.lon, wp.lat])
          .addTo(map);
        markersRef.current.push(m);
      });

      const src = map.getSource("route-segments") as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (src) {
        const coords = lineCoordinates(from, to, waypoints, geometry);
        src.setData(coloredSegmentsGeoJSON(coords, waypoints));
      }
      const altSrc = map.getSource("route-alts") as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (altSrc) {
        altSrc.setData(alternativesGeoJSON(alternatives));
      }
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);
  }, [waypoints, selectedIdx, from, to, geometry, alternatives]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) {
      setAnchor(null);
      return;
    }
    const update = () => {
      const p = map.project([selected.lon, selected.lat]);
      setAnchor({ x: p.x, y: p.y });
    };
    update();
    map.on("move", update);
    map.on("zoom", update);
    map.on("resize", update);
    return () => {
      map.off("move", update);
      map.off("zoom", update);
      map.off("resize", update);
    };
  }, [selected]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {selected && anchor ? (
        <div
          className="pointer-events-auto absolute z-20 w-[min(260px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl border border-outline-variant/30 bg-surface p-3 shadow-[0px_12px_36px_rgba(0,0,0,0.18)]"
          style={{ left: anchor.x, top: anchor.y }}
          role="dialog"
          aria-label={selected.name}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-on-surface">
                {selected.name}
              </p>
              <p className="text-xs text-on-surface-variant">
                {selected.timeLabel}
              </p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
              aria-label={t("map.closePopup")}
              onClick={() => setSelectedIdx(null)}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden>
                close
              </span>
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold tabular-nums text-on-surface">
                {formatTemp(selected.temperatureC)}
              </span>
              <span
                className="material-symbols-outlined text-secondary"
                aria-hidden
              >
                {weatherIcon(selected.condition)}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant">
              {t("routes.rainProbability")}:{" "}
              <span className="font-semibold text-on-surface">
                {selected.rainProbability}%
              </span>
            </p>
            <p className="text-sm text-on-surface-variant">
              {t("routes.rainAmount")}:{" "}
              <span className="font-semibold text-on-surface">
                {t("routes.rainAmountValue", {
                  mm: selected.precipitationMm ?? 0,
                })}
              </span>
            </p>
          </div>
          {selected.advisories.length > 0 ? (
            <ul className="mt-3 space-y-2 border-t border-outline-variant/20 pt-2">
              {selected.advisories.map((a) => (
                <li key={a.id} className="flex gap-2 text-sm">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
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
                    <span className="mt-0.5 block text-xs text-on-surface-variant">
                      {a.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-on-surface-variant">
              {t("routes.noAdvisories")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
