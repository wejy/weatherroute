import Link from "next/link";
import { discoverDestinations } from "@/server/services/weather-service";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNav } from "@/components/layout/top-nav";
import { MockMap } from "@/components/map/mock-map";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";

export const metadata = { title: "Map Explorer" };

export default async function MapPage() {
  const result = await discoverDestinations({
    origin: "Helsinki, FI",
    distance: "region",
    weatherGoal: "sun",
    datePreset: "weekend",
  });

  return (
    <div className="h-screen w-full overflow-hidden bg-background text-on-background">
      <SideNav active="/map">
        <h2 className="mb-4 text-xl font-semibold text-on-surface">
          Nearby Ideal Weather
        </h2>
        <div className="relative mb-6">
          <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-secondary">
            search
          </span>
          <input
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pr-4 pl-10 text-base text-on-surface focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Search within 300km..."
            defaultValue=""
            readOnly
          />
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
          {result.destinations.slice(0, 5).map((d) => (
            <Link
              key={d.id}
              href={`/destinations/${d.slug}`}
              className="cursor-pointer rounded-xl border border-surface-variant bg-surface-container-lowest p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-colors hover:border-primary/50"
            >
              <div className="mb-2 flex items-start justify-between">
                <h3 className="m-0 text-xl font-semibold text-on-surface">
                  {d.name}
                </h3>
                <span
                  className={`material-symbols-outlined fill-icon ${weatherIconClass(d.condition)}`}
                >
                  {weatherIcon(d.condition)}
                </span>
              </div>
              <p className="mb-3 text-sm text-on-surface-variant">
                {d.distanceKm} km away · {formatTemp(d.temperatureC)}C
              </p>
              <span className="rounded-full bg-surface-container px-2 py-1 text-sm text-secondary">
                Rain probability: {d.rainProbability}%
              </span>
            </Link>
          ))}
        </div>
        <Link
          href="/routes?from=Helsinki&to=Tampere"
          className="mt-6 block w-full rounded-lg bg-primary py-3 text-center text-xl font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
        >
          Generate Route
        </Link>
      </SideNav>

      <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between bg-surface/80 px-margin-mobile shadow-[0px_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl md:hidden">
        <h1 className="text-2xl font-bold text-primary">WeatherTrip</h1>
        <Link href="/login">
          <span className="material-symbols-outlined text-on-surface-variant">
            account_circle
          </span>
        </Link>
      </header>

      <main className="relative z-0 h-full w-full pt-16 lg:pt-0 lg:pl-80">
        <MockMap markers={result.mapMarkers} showRadius className="absolute inset-0" />

        <div className="absolute top-4 right-4 z-20 flex gap-4 lg:top-4">
          <button
            type="button"
            className="flex items-center justify-center rounded-full border border-outline-variant/30 bg-surface/90 p-3 text-on-surface shadow-[0px_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-colors hover:bg-surface-container"
            aria-label="Recenter"
          >
            <span className="material-symbols-outlined">my_location</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded-full border border-outline-variant/30 bg-surface/90 p-3 text-on-surface shadow-[0px_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-colors hover:bg-surface-container"
            aria-label="Layers"
          >
            <span className="material-symbols-outlined">layers</span>
          </button>
        </div>

        <Link
          href="/?weatherGoal=sun"
          className="absolute right-8 bottom-24 z-30 flex items-center gap-3 rounded-xl bg-primary px-6 py-4 text-on-primary shadow-[0px_10px_30px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1 hover:bg-primary-container hover:text-on-primary-container lg:bottom-8"
        >
          <span className="material-symbols-outlined">tune</span>
          <span className="text-xl font-semibold">Filter Weather</span>
        </Link>
      </main>

      <BottomNav active="/map" />
    </div>
  );
}
