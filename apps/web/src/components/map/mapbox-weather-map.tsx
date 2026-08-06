"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { cn, formatTemp } from "@/lib/utils";
import { formatDistanceKm } from "@/lib/distance";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { circlePolygon, type WeatherMapProps } from "@/components/map/geo";
import { destinationHref } from "@/lib/discover-query";
import { MapMarkerPopup } from "@/components/map/map-marker-popup";
import { useI18n } from "@/components/i18n/locale-provider";
import { useResolvedTheme } from "@/components/theme/theme-provider";
import { mapboxDarkBasemapClass, mapboxStyleForTheme } from "@/lib/theme";
import { prefetchWikipediaForMarkers } from "@/lib/wikipedia-client";
import type { MapMarkerDto } from "@/lib/types";
import {
  markerChipHtml,
  markerWarnDotHtml,
  originDotHtml,
  weatherMarkerToneBorder,
} from "@/lib/map-marker-chrome";
import {
  installMapboxTelemetryGuard,
  safeRemoveMap,
} from "@/lib/mapbox-safe-remove";

function addSearchRadiusLayers(
  map: mapboxgl.Map,
  origin: { lat: number; lon: number },
  radiusKm: number,
) {
  if (radiusKm >= 15000) {
    map.setCenter([origin.lon, origin.lat]);
    map.setZoom(2);
    return;
  }
  const circle = circlePolygon(origin.lon, origin.lat, radiusKm);
  if (map.getSource("search-radius")) {
    (map.getSource("search-radius") as mapboxgl.GeoJSONSource).setData(circle);
  } else {
    map.addSource("search-radius", {
      type: "geojson",
      data: circle,
    });
    map.addLayer({
      id: "search-radius-fill",
      type: "fill",
      source: "search-radius",
      paint: {
        "fill-color": "#14b863",
        "fill-opacity": 0.08,
      },
    });
    map.addLayer({
      id: "search-radius-line",
      type: "line",
      source: "search-radius",
      paint: {
        "line-color": "#14b863",
        "line-width": 2,
        "line-opacity": 0.55,
      },
    });
  }

  const bounds = new mapboxgl.LngLatBounds();
  for (const c of circle.geometry.coordinates[0]!) {
    bounds.extend(c as [number, number]);
  }
  map.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 0 });
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
  const { locale, t } = useI18n();
  const theme = useResolvedTheme();
  const mapStyle = mapboxStyleForTheme(theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const appliedStyleRef = useRef(mapStyle);
  const locationQueryRef = useRef(locationQuery);
  locationQueryRef.current = locationQuery;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const ignoreMapClickUntilRef = useRef(0);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [densePopup, setDensePopup] = useState(false);

  const selectedMarker: MapMarkerDto | null =
    markers.find((m) => m.id === selectedId && !m.id.startsWith("origin-")) ??
    null;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setDensePopup(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

    installMapboxTelemetryGuard();
    mapboxgl.accessToken = token;

    const center: [number, number] = origin
      ? [origin.lon, origin.lat]
      : [26.0, 64.0]; // mid-Finland fallback while GPS resolves (not Helsinki)

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      center,
      zoom: origin ? 6 : 4.5,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    appliedStyleRef.current = mapStyle;

    const onMapClick = () => {
      // Marker clicks also fire the map click; ignore the immediate follow-up.
      if (Date.now() < ignoreMapClickUntilRef.current) return;
      setSelectedId(null);
    };
    map.on("click", onMapClick);

    map.on("load", () => {
      if (showRadius && origin) {
        addSearchRadiusLayers(map, origin, radiusKm);
      } else if (origin) {
        map.setCenter([origin.lon, origin.lat]);
        map.setZoom(radiusKm >= 15000 ? 2 : 5);
      }
    });

    return () => {
      map.off("click", onMapClick);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      safeRemoveMap(map);
      mapRef.current = null;
    };
    // Theme/style changes use setStyle below — avoid full remount (Mapbox errorCb race).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mapStyle applied via separate effect
  }, [token, origin?.lat, origin?.lon, radiusKm, showRadius]);

  // Swap basemap on theme change without destroying the Map instance.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (appliedStyleRef.current === mapStyle) return;
    appliedStyleRef.current = mapStyle;

    const onStyle = () => {
      if (showRadius && origin) {
        addSearchRadiusLayers(map, origin, radiusKm);
      }
    };
    map.once("style.load", onStyle);
    map.setStyle(mapStyle);
    return () => {
      map.off("style.load", onStyle);
    };
  }, [mapStyle, origin, radiusKm, showRadius]);

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
        el.className = "solviax-map-marker";
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
        const severe =
          marker.condition === "storm" ||
          marker.condition === "hail" ||
          marker.condition === "freezing_rain";
        const toneBorder = weatherMarkerToneBorder({ tone, severe, selected });
        const showWarn =
          tone === "warning" || tone === "caution" || severe;
        el.innerHTML = isOrigin
          ? originDotHtml()
          : markerChipHtml({
              tempLabel: `${Math.round(marker.temperatureC)}°`,
              toneBorder,
              warnDotHtml: showWarn
                ? markerWarnDotHtml({ severe, tone })
                : "",
            });

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
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        theme === "dark" && mapboxDarkBasemapClass,
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {showRadius && radiusKm < 15000 && (
        <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-full border border-primary/20 bg-surface/90 px-3 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-md">
          {t("map.radiusKm", {
            radius: formatDistanceKm(radiusKm, locale),
          })}
        </div>
      )}

      {selectedMarker && densePopup ? (
        <>
          <button
            type="button"
            className="absolute inset-0 z-30 bg-inverse-surface/20"
            aria-label={t("map.closePopup")}
            onClick={() => setSelectedId(null)}
          />
          {/* Sit in the visible mid-band: below mobile header/filters, above bottom cards */}
          <div className="pointer-events-none absolute inset-x-3 top-[28%] z-40 max-h-[min(42%,16rem)] sm:inset-x-4">
            <div className="pointer-events-auto max-h-full overflow-y-auto overscroll-contain rounded-xl shadow-[0px_12px_36px_rgba(0,0,0,0.2)]">
              <MapMarkerPopup
                dense
                marker={selectedMarker}
                href={destinationHref(selectedMarker.id, locationQuery)}
                onClose={() => setSelectedId(null)}
              />
            </div>
          </div>
        </>
      ) : null}

      {selectedMarker && anchor && !densePopup ? (
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
      ) : null}

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
