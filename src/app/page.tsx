import { Suspense } from "react";
import { discoverQuerySchema } from "@/lib/validation/schemas";
import { discoverDestinations } from "@/server/services/weather-service";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { DiscoverSearch } from "@/components/discover/search-island";
import { DestinationCard } from "@/components/discover/destination-card";
import { WeatherFilters } from "@/components/discover/weather-filters";
import { MockMap } from "@/components/map/mock-map";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const parsed = discoverQuerySchema.parse(flat);
  const result = await discoverDestinations(parsed);

  return (
    <>
      <TopNav active="/" />
      <main className="relative w-full overflow-x-hidden pt-16 pb-24 md:pb-32">
        <div className="fixed inset-0 z-0">
          <MockMap markers={result.mapMarkers} className="opacity-70" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface/40 via-surface/10 to-surface/80 mix-blend-overlay" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-margin-mobile md:px-margin-desktop">
          <div className="pointer-events-none absolute top-0 left-0 -z-10 h-[614px] w-full overflow-hidden opacity-40">
            <div className="animate-float-slow absolute top-[-10%] right-[-5%] h-96 w-96 rounded-full bg-primary-container/20 blur-[100px]" />
            <div className="animate-float-fast absolute top-[20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-secondary-container/10 blur-[120px]" />
          </div>

          <section className="mt-8 mb-12 flex flex-col items-center text-center md:mt-12 md:mb-16">
            <div className="mb-8 inline-block max-w-4xl rounded-[2rem] border border-outline-variant/20 bg-surface/80 p-8 shadow-lg backdrop-blur-xl">
              <h1 className="mb-4 text-4xl leading-tight font-bold tracking-tight text-on-surface md:text-5xl md:leading-[56px]">
                Find perfect weather,
                <br className="hidden md:block" /> no matter where you go.
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-on-surface-variant">
                Enter your constraints and let our climate models discover the
                best destinations for your weekend escape.
              </p>
            </div>

            <DiscoverSearch
              defaults={{
                origin: parsed.origin,
                distance: parsed.distance,
                weatherGoal: parsed.weatherGoal,
              }}
            />
          </section>

          <Suspense fallback={null}>
            <WeatherFilters active={parsed.weatherGoal} />
          </Suspense>

          <section id="results" className="relative z-10 mx-auto mb-12 w-full max-w-5xl">
            <h2 className="mb-6 inline-block rounded-2xl border border-outline-variant/20 bg-surface/80 px-4 py-2 text-2xl font-semibold text-on-surface shadow-sm backdrop-blur-xl md:mb-8 md:text-[32px] md:leading-10">
              Viikonlopun aurinkoisimmat
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              {result.destinations.slice(0, 6).map((dest) => (
                <DestinationCard key={dest.id} destination={dest} />
              ))}
            </div>
            {result.destinations.length === 0 && (
              <p className="rounded-2xl border border-outline-variant/20 bg-surface/90 p-8 text-center text-on-surface-variant backdrop-blur-xl">
                No destinations in range. Try a wider distance filter.
              </p>
            )}
          </section>
        </div>
      </main>
      <BottomNav active="/" />
    </>
  );
}
