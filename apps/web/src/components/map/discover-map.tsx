"use client";

import dynamic from "next/dynamic";
import type { MapMarkerDto, PlaceDto } from "@/lib/types";
import { MockMap } from "@/components/map/mock-map";
import { cn } from "@/lib/utils";

const MapboxWeatherMap = dynamic(
  () =>
    import("@/components/map/mapbox-weather-map").then(
      (m) => m.MapboxWeatherMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#dfe9f5] text-sm text-on-surface-variant">
        Loading map…
      </div>
    ),
  },
);

export function DiscoverMap({
  markers,
  origin,
  radiusKm = 300,
  showRadius = true,
  className,
  mapboxToken,
  hasSecretToken = false,
  locationQuery,
}: {
  markers: MapMarkerDto[];
  origin?: PlaceDto;
  radiusKm?: number;
  showRadius?: boolean;
  className?: string;
  /** Public pk. token from NEXT_PUBLIC_MAPBOX_TOKEN */
  mapboxToken?: string;
  /** True when MAPBOX_ACCESS_TOKEN is an sk. secret token */
  hasSecretToken?: boolean;
  locationQuery?: {
    origin?: string;
    lat?: number;
    lon?: number;
  };
}) {
  const token = mapboxToken?.trim() || "";
  const canUseMapbox = token.startsWith("pk.");

  if (canUseMapbox) {
    return (
      <MapboxWeatherMap
        markers={markers}
        origin={origin}
        radiusKm={radiusKm}
        showRadius={showRadius}
        className={className}
        token={token}
        locationQuery={locationQuery}
      />
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <MockMap
        markers={markers}
        origin={origin}
        radiusKm={radiusKm}
        showRadius={showRadius}
        className="h-full w-full"
        locationQuery={locationQuery}
      />
      <div className="absolute right-4 bottom-16 z-30 max-w-sm rounded-xl border border-outline-variant/30 bg-surface/95 p-3 text-left text-xs leading-relaxed text-on-surface-variant shadow-lg backdrop-blur-md md:bottom-4">
        {hasSecretToken || token.startsWith("sk.") ? (
          <p>
            Mapbox GL needs a <strong className="text-on-surface">public</strong>{" "}
            token (<code className="text-primary">pk.…</code>). The{" "}
            <code className="text-primary">sk.…</code> token in{" "}
            <code>MAPBOX_ACCESS_TOKEN</code> is secret and cannot be used in the
            browser. In the{" "}
            <a
              className="text-primary underline"
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noreferrer"
            >
              Mapbox token dashboard
            </a>
            , create a <strong className="text-on-surface">public</strong>{" "}
            token and set:
            <br />
            <code className="mt-1 block text-primary">
              NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_public_token
            </code>
          </p>
        ) : (
          <p>
            Set{" "}
            <code className="text-primary">NEXT_PUBLIC_MAPBOX_TOKEN=pk.…</code>{" "}
            in <code>.env.local</code>, then restart the dev server.
          </p>
        )}
      </div>
    </div>
  );
}
