"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";
import type { PlaceDto, RouteWaypointDto } from "@/lib/types";

const STYLE = "mapbox://styles/mapbox/light-v11";

function routeLineGeoJSON(
  coordinates: [number, number][],
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markerEl(
  label: string,
  tone: "start" | "mid" | "end",
): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "weathertrip-route-marker";
  el.setAttribute("aria-label", label);
  el.style.border = "none";
  el.style.background = "transparent";
  el.style.padding = "0";
  el.style.cursor = "default";

  const bg =
    tone === "start" ? "#3525cd" : tone === "end" ? "#005338" : "#6b7280";
  el.innerHTML = `<div style="background:${bg};color:#fff;border-radius:999px;padding:8px 12px;font:600 12px/1 Inter,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.18);border:2px solid #fff;white-space:nowrap;">${escapeHtml(label)}</div>`;
  return el;
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

export function MapboxRouteMap({
  from,
  to,
  waypoints,
  geometry,
  token,
  className,
}: {
  from: PlaceDto;
  to: PlaceDto;
  waypoints: RouteWaypointDto[];
  geometry?: [number, number][];
  token: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const geometryKey = geometry?.length
    ? `${geometry.length}:${geometry[0]?.join(",")}:${geometry[geometry.length - 1]?.join(",")}`
    : "straight";

  useEffect(() => {
    if (!containerRef.current || !token) return;

    mapboxgl.accessToken = token;

    const coords = lineCoordinates(from, to, waypoints, geometry);

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
      map.addSource("route-line", {
        type: "geojson",
        data: routeLineGeoJSON(coords),
      });
      map.addLayer({
        id: "route-line-casing",
        type: "line",
        source: "route-line",
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
        source: "route-line",
        paint: {
          "line-color": "#3525cd",
          "line-width": 4,
          "line-opacity": 0.9,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      const bounds = new mapboxgl.LngLatBounds();
      for (const c of coords) bounds.extend(c);
      map.fitBounds(bounds, { padding: 72, maxZoom: 10, duration: 0 });
    });

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const pins: Array<{
      place: PlaceDto | RouteWaypointDto;
      tone: "start" | "mid" | "end";
    }> = [
      { place: from, tone: "start" },
      ...waypoints
        .filter((w) => w.role === "midpoint")
        .map((w) => ({ place: w, tone: "mid" as const })),
      { place: to, tone: "end" },
    ];

    for (const pin of pins) {
      const name = "name" in pin.place ? pin.place.name : "";
      const m = new mapboxgl.Marker({
        element: markerEl(name, pin.tone),
        anchor: "bottom",
      })
        .setLngLat([pin.place.lon, pin.place.lat])
        .addTo(map);
      markersRef.current.push(m);
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [
    token,
    from.id,
    from.lat,
    from.lon,
    from.name,
    to.id,
    to.lat,
    to.lon,
    to.name,
    waypoints,
    geometryKey,
    geometry,
  ]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
