"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { cn, formatTemp } from "@/lib/utils";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { circlePolygon, type WeatherMapProps } from "@/components/map/geo";
import { destinationHref } from "@/lib/discover-query";
import { MapMarkerPopup } from "@/components/map/map-marker-popup";
import { useI18n } from "@/components/i18n/locale-provider";
import { prefetchWikipediaForMarkers } from "@/lib/wikipedia-client";
import type { MapMarkerDto } from "@/lib/types";

const STYLE = "mapbox://styles/mapbox/light-v11";

export function MapboxWeatherMap({
  markers,
  origin,
  radiusKm = 300,
  showRadius = true,
  className,
  token,
  locationQuery,
}: WeatherMapProps) {
  const { locale, t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const locationQueryRef = useRef(locationQuery);
  locationQueryRef.current = locationQuery;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const ignoreMapClickUntilRef = useRef(0);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const selectedMarker: MapMarkerDto | null =
    markers.find((m) => m.id === selectedId && !m.id.startsWith("origin-")) ??
    null;

  // Staggered background Wikipedia prefetch for destination pins (~8).
  useEffect(() => {
    const places = markers
      .filter((m) => !m.id.startsWith("origin-"))
      .map((m) => ({ name: m.name, lat: m.lat, lon: m.lon }));
    if (places.length === 0) return;

    const ac = new AbortController();
    prefetchWikipediaForMarkers(places, locale === "fi" ? "fi" : "en", {
      staggerMs: 220,
      signal: ac.signal,
    });
    return () => ac.abort();
  }, [markers, locale]);

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

    const onMapClick = () => {
      // Marker clicks also fire the map click; ignore the immediate follow-up.
      if (Date.now() < ignoreMapClickUntilRef.current) return;
      setSelectedId(null);
    };
    map.on("click", onMapClick);

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
      map.off("click", onMapClick);
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
        el.style.cursor = isOrigin ? "default" : "pointer";
        el.style.border = "none";
        el.style.background = "transparent";
        el.style.padding = "0";
        el.style.minWidth = "44px";
        el.style.minHeight = "32px";

        const selected = selectedIdRef.current === marker.id;
        const tone = marker.tone ?? "clear";
        const severe = marker.condition === "storm";
        const toneBorder = severe
          ? "#ba1a1a"
          : tone === "warning"
            ? "#006591"
            : tone === "caution"
              ? "#f59e0b"
              : selected
                ? "#3525cd"
                : "rgba(199,196,216,.5)";
        const warnDot =
          tone === "warning" || tone === "caution" || severe
            ? `<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:999px;background:${severe ? "#ba1a1a" : tone === "warning" ? "#006591" : "#f59e0b"};border:2px solid #fff;" aria-hidden="true"></span>`
            : "";
        el.innerHTML = isOrigin
          ? `<div style="background:#3525cd;color:#fff;border-radius:999px;padding:8px 12px;font:600 12px/1 Inter,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.18);border:2px solid #fff;">●</div>`
          : `<div style="position:relative;display:flex;align-items:center;gap:4px;background:rgba(252,248,255,.98);border-radius:999px;padding:8px 12px;font:600 13px/1 Inter,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.12);border:2px solid ${toneBorder};color:#1b1b24;transform:${selected ? "scale(1.08)" : "none"};">
              <span>${Math.round(marker.temperatureC)}°</span>
              ${warnDot}
            </div>`;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (isOrigin) return;
          ignoreMapClickUntilRef.current = Date.now() + 400;
          setSelectedId((prev) => (prev === marker.id ? null : marker.id));
        });

        const m = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([marker.lon, marker.lat])
          .addTo(map);

        markersRef.current.push(m);
      }
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);
  }, [markers, selectedId]);

  // Keep React popup anchored to the selected marker while the map moves.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedMarker) {
      setAnchor(null);
      return;
    }

    const update = () => {
      const p = map.project([selectedMarker.lon, selectedMarker.lat]);
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
  }, [selectedMarker]);

  // Drop selection if the marker disappeared from the current result set.
  useEffect(() => {
    if (selectedId && !markers.some((m) => m.id === selectedId)) {
      setSelectedId(null);
    }
  }, [markers, selectedId]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {showRadius && radiusKm < 15000 && (
        <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-full border border-primary/20 bg-surface/90 px-3 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-md">
          {t("map.radiusKm", { km: radiusKm.toLocaleString() })}
        </div>
      )}

      {selectedMarker && anchor && (
        <div
          className="pointer-events-none absolute z-30"
          style={{
            left: anchor.x,
            top: anchor.y,
            transform: "translate(-50%, calc(-100% - 14px))",
          }}
        >
          <div className="pointer-events-auto max-h-[min(70vh,520px)] overflow-y-auto">
            <MapMarkerPopup
              marker={selectedMarker}
              href={destinationHref(selectedMarker.id, locationQuery)}
              onClose={() => setSelectedId(null)}
            />
          </div>
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
