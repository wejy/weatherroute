"use client";

import dynamic from "next/dynamic";
import type { PlaceDto, RouteWaypointDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const MapboxRouteMap = dynamic(
  () =>
    import("@/components/map/mapbox-route-map").then((m) => m.MapboxRouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#dfe9f5] text-sm text-on-surface-variant">
        Loading map…
      </div>
    ),
  },
);

function MockRouteMap({
  from,
  to,
  className,
}: {
  from: PlaceDto;
  to: PlaceDto;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[#dfe9f5]",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 40% 70%, #c5d8ef, transparent 50%), linear-gradient(160deg, #e8f1f8, #d4e4f5 60%, #cfe0d8)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <svg
          className="h-full max-h-[80%] w-full max-w-md drop-shadow-lg"
          viewBox="0 0 200 400"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="route-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#4edea3" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#4edea3" />
            </linearGradient>
          </defs>
          <circle cx="150" cy="350" r="6" fill="#3525cd" />
          <path
            d="M150,350 Q130,250 100,200 T50,50"
            fill="none"
            stroke="url(#route-gradient)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="6" fill="#005338" />
        </svg>
      </div>
      <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-outline-variant/30 bg-surface/95 p-3 text-sm text-on-surface shadow-sm backdrop-blur-md">
        <p className="font-semibold text-on-surface">
          {from.name} → {to.name}
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Set{" "}
          <code className="text-primary">NEXT_PUBLIC_MAPBOX_TOKEN=pk.…</code> for
          the interactive map.
        </p>
      </div>
    </div>
  );
}

export function RouteMap({
  from,
  to,
  waypoints,
  geometry,
  mapboxToken,
  className,
}: {
  from: PlaceDto;
  to: PlaceDto;
  waypoints: RouteWaypointDto[];
  geometry?: [number, number][];
  mapboxToken?: string;
  className?: string;
}) {
  const token = mapboxToken?.trim() || "";
  if (token.startsWith("pk.")) {
    return (
      <MapboxRouteMap
        from={from}
        to={to}
        waypoints={waypoints}
        geometry={geometry}
        token={token}
        className={className}
      />
    );
  }

  return <MockRouteMap from={from} to={to} className={className} />;
}
