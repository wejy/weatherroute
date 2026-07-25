import Link from "next/link";
import type { MapMarkerDto } from "@/lib/types";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** CSS mock map — swaps for Mapbox GL when NEXT_PUBLIC_MAPBOX_TOKEN is set. */
export function MockMap({
  markers,
  className,
  showRadius,
}: {
  markers: MapMarkerDto[];
  className?: string;
  showRadius?: boolean;
}) {
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
            radial-gradient(circle at 20% 30%, #c5d8ef 0%, transparent 40%),
            radial-gradient(circle at 70% 60%, #b8d4c8 0%, transparent 35%),
            linear-gradient(135deg, #e8f1f8 0%, #d4e4f5 45%, #cfe0d8 100%)
          `,
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
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
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex h-[min(70vw,420px)] w-[min(70vw,420px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
          <div className="h-4 w-4 rounded-full border-2 border-surface bg-primary shadow-[0_0_15px_rgba(53,37,205,0.5)]" />
          <div className="absolute top-4 rounded-full border border-primary/20 bg-surface/80 px-3 py-1 text-sm font-medium text-primary shadow-sm backdrop-blur-sm">
            300km Radius
          </div>
        </div>
      )}

      {markers.map((marker, index) => {
        const left = 25 + ((index * 17) % 55);
        const top = 20 + ((index * 23) % 55);
        return (
          <Link
            key={marker.id}
            href={`/destinations/${marker.id}`}
            className="group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center transition-all hover:z-30"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div className="mb-1 flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface/90 px-3 py-1.5 shadow-lg backdrop-blur-md transition-transform group-hover:scale-105">
              <span className="text-xl font-semibold text-on-surface">
                {formatTemp(marker.temperatureC)}
              </span>
              <span
                className={`material-symbols-outlined fill-icon text-lg ${weatherIconClass(marker.condition)}`}
              >
                {weatherIcon(marker.condition)}
              </span>
            </div>
            <div className="pointer-events-none rounded-lg border border-outline-variant/20 bg-surface/95 p-2 text-center opacity-0 shadow-xl backdrop-blur-xl transition-opacity group-hover:opacity-100">
              <p className="text-sm font-semibold text-on-surface">
                {marker.name}
              </p>
              {marker.tomorrowTempC != null && (
                <p className="text-[13px] font-semibold tracking-wider text-on-surface-variant">
                  Tom: +{Math.round(marker.tomorrowTempC)}°
                </p>
              )}
            </div>
          </Link>
        );
      })}

      <div className="absolute right-4 bottom-4 z-20 rounded-xl border border-outline-variant/20 bg-surface/90 px-3 py-2 text-xs font-medium text-on-surface-variant shadow-sm backdrop-blur-md">
        Mock map · add Mapbox token for live tiles
      </div>
    </div>
  );
}
