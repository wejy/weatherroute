"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn, formatTemp } from "@/lib/utils";
import type { PlaceDto, RouteAlternativeDto, RouteWaypointDto } from "@/lib/types";
import { WEATHER_TONE_COLORS, worseTone, mapWeatherColor, isSevereMapAlert, SEVERE_ALERT_COLOR } from "@/lib/weather-tone";
import { weatherIcon } from "@/lib/weather-icons";
import { useI18n } from "@/components/i18n/locale-provider";
import { useResolvedTheme } from "@/components/theme/theme-provider";
import { mapboxDarkBasemapClass, mapboxStyleForTheme } from "@/lib/theme";
import {
  escapeMarkerHtml,
  routeWarnBadgeHtml,
  routeWaypointChipHtml,
} from "@/lib/map-marker-chrome";
import {
  installMapboxTelemetryGuard,
  safeRemoveMap,
} from "@/lib/mapbox-safe-remove";

function escapeHtml(value: string): string {
  return escapeMarkerHtml(value);
}

function lineCoordinates(
  from: PlaceDto,
  to: PlaceDto,
  waypoints: RouteWaypointDto[],
  geometry?: [number, number][],
  opts?: { drawRouteLine?: boolean },
): [number, number][] {
  if (opts?.drawRouteLine === false) return [];
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
      a.condition === "storm" ||
      b.condition === "storm" ||
      a.condition === "hail" ||
      b.condition === "hail"
        ? a.condition === "hail" || b.condition === "hail"
          ? "hail"
          : "storm"
        : a.condition === "freezing_rain" || b.condition === "freezing_rain"
          ? "freezing_rain"
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
  const badgeColor = severe
    ? SEVERE_ALERT_COLOR
    : hasWarning
      ? WEATHER_TONE_COLORS.warning
      : WEATHER_TONE_COLORS.caution;
  const warnBadge =
    hasWarning || hasCaution ? routeWarnBadgeHtml(badgeColor) : "";

  el.innerHTML = routeWaypointChipHtml({
    tempLabel: `${Math.round(wp.temperatureC)}°`,
    rainPct: wp.rainProbability,
    toneBorder: border,
    warnBadgeHtml: warnBadge,
    nameHtml: escapeHtml(wp.name),
    selected,
  });
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
  routingStatus,
}: {
  from: PlaceDto;
  to: PlaceDto;
  waypoints: RouteWaypointDto[];
  geometry?: [number, number][];
  alternatives?: RouteAlternativeDto[];
  token: string;
  className?: string;
  /** When unreachable, do not draw a fake straight-line “route”. */
  routingStatus?: "routed" | "unreachable";
}) {
  const { t } = useI18n();
  const theme = useResolvedTheme();
  const mapStyle = mapboxStyleForTheme(theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const appliedStyleRef = useRef(mapStyle);
  const waypointsRef = useRef(waypoints);
  waypointsRef.current = waypoints;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const drawRouteLine = routingStatus !== "unreachable";
  const geometryKey = !drawRouteLine
    ? "unreachable"
    : geometry?.length
      ? `${geometry.length}:${geometry[0]?.join(",")}:${geometry[geometry.length - 1]?.join(",")}`
      : "straight";
  const altKey = (alternatives ?? [])
    .map((a) => `${a.index}:${a.selected}:${a.geometry.length}`)
    .join("|");

  const selected = selectedIdx != null ? waypoints[selectedIdx] : null;

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedIdx(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  // Create map once per route geometry / endpoints.
  useEffect(() => {
    if (!containerRef.current || !token) return;

    installMapboxTelemetryGuard();
    mapboxgl.accessToken = token;
    setSelectedIdx(null);

    const coords = lineCoordinates(from, to, waypointsRef.current, geometry, {
      drawRouteLine,
    });

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [(from.lon + to.lon) / 2, (from.lat + to.lat) / 2],
      zoom: 6,
      attributionControl: true,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    mapRef.current = map;
    appliedStyleRef.current = mapStyle;

    const addRouteLayers = () => {
      if (!map.getSource("route-alts")) {
        map.addSource("route-alts", {
          type: "geojson",
          data: alternativesGeoJSON(drawRouteLine ? alternatives : undefined),
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
      }

      if (!map.getSource("route-segments")) {
        map.addSource("route-segments", {
          type: "geojson",
          data:
            coords.length >= 2
              ? coloredSegmentsGeoJSON(coords, waypointsRef.current)
              : { type: "FeatureCollection", features: [] },
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
      }

      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([from.lon, from.lat]);
      bounds.extend([to.lon, to.lat]);
      for (const c of coords) bounds.extend(c);
      for (const wp of waypointsRef.current) {
        bounds.extend([wp.lon, wp.lat]);
      }
      if (drawRouteLine) {
        for (const a of alternatives ?? []) {
          for (const c of a.geometry) bounds.extend(c);
        }
      }
      map.fitBounds(bounds, { padding: 72, maxZoom: 10, duration: 0 });
    };

    map.on("load", addRouteLayers);

    map.on("click", () => setSelectedIdx(null));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      safeRemoveMap(map);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on route identity; theme via setStyle
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
    drawRouteLine,
  ]);

  // Theme basemap swap without tearing down the map (avoids Mapbox errorCb race).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (appliedStyleRef.current === mapStyle) return;
    appliedStyleRef.current = mapStyle;

    const coords = lineCoordinates(from, to, waypointsRef.current, geometry, {
      drawRouteLine,
    });

    const onStyle = () => {
      map.addSource("route-alts", {
        type: "geojson",
        data: alternativesGeoJSON(drawRouteLine ? alternatives : undefined),
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
        layout: { "line-cap": "round", "line-join": "round" },
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
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addSource("route-segments", {
        type: "geojson",
        data:
          coords.length >= 2
            ? coloredSegmentsGeoJSON(coords, waypointsRef.current)
            : { type: "FeatureCollection", features: [] },
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
        layout: { "line-cap": "round", "line-join": "round" },
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
        layout: { "line-cap": "round", "line-join": "round" },
      });
    };

    map.once("style.load", onStyle);
    map.setStyle(mapStyle);
    return () => {
      map.off("style.load", onStyle);
    };
  }, [mapStyle, from, to, geometry, alternatives, drawRouteLine]);

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
        const coords = lineCoordinates(from, to, waypoints, geometry, {
          drawRouteLine,
        });
        src.setData(
          coords.length >= 2
            ? coloredSegmentsGeoJSON(coords, waypoints)
            : { type: "FeatureCollection", features: [] },
        );
      }
      const altSrc = map.getSource("route-alts") as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (altSrc) {
        altSrc.setData(
          alternativesGeoJSON(drawRouteLine ? alternatives : undefined),
        );
      }
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);
  }, [
    waypoints,
    selectedIdx,
    from,
    to,
    geometry,
    alternatives,
    drawRouteLine,
  ]);

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
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        theme === "dark" && mapboxDarkBasemapClass,
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {selected && anchor ? (
        <div
          className="pointer-events-auto absolute z-20 w-[min(260px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl border border-outline-variant/30 bg-surface p-3 shadow-[0px_12px_36px_rgba(0,0,0,0.18)]"
          style={{ left: anchor.x, top: anchor.y }}
          role="region"
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
