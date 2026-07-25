import Link from "next/link";
import Image from "next/image";
import type { DestinationDto } from "@/lib/types";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";

export function DestinationCard({ destination }: { destination: DestinationDto }) {
  return (
    <Link href={`/destinations/${destination.slug}`}>
      <article className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm transition-all duration-300 hover:shadow-[0px_10px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={destination.imageUrl}
            alt={destination.placeName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-outline-variant/10 bg-surface/90 px-3 py-1.5 shadow-sm backdrop-blur-md">
            <span
              className={`material-symbols-outlined fill-icon text-lg ${weatherIconClass(destination.condition)}`}
            >
              {weatherIcon(destination.condition)}
            </span>
            <span className="text-sm font-semibold text-on-surface">
              {formatTemp(destination.temperatureC)}C
            </span>
          </div>
        </div>
        <div className="flex flex-col p-5">
          <h3 className="mb-1 text-xl font-semibold text-on-surface">
            {destination.placeName}
          </h3>
          <p className="flex items-center gap-1.5 text-base text-on-surface-variant">
            <span className="material-symbols-outlined text-sm text-outline">
              {weatherIcon(destination.condition)}
            </span>
            {destination.conditionLabel}
          </p>
        </div>
      </article>
    </Link>
  );
}
