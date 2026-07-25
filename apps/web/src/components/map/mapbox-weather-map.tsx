"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, formatTemp } from "@/lib/utils";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { circlePolygon, type WeatherMapProps } from "@/components/map/geo";
import { destinationHref } from "@/lib/discover-query";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const router = useRouter();
  const locationQueryRef = useRef(locationQuery);
  locationQueryRef.current = locationQuery;

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

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!isOrigin) {
            router.push(destinationHref(marker.id, locationQueryRef.current));
          }
        });

        const m = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([marker.lon, marker.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(
              `<strong>${marker.name}</strong>${
                isOrigin
                  ? ""
                  : `<div style="opacity:.7;margin-top:2px">${Math.round(marker.temperatureC)}° · forecast</div>`
              }`,
            ),
          )
          .addTo(map);

        markersRef.current.push(m);
      }
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);
  }, [markers, router]);

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
