import Link from "next/link";
import { Suspense } from "react";
import { discoverDestinations } from "@/server/services/weather-service";
import { discoverQuerySchema } from "@/lib/validation/schemas";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNav } from "@/components/layout/top-nav";
import { DiscoverMap } from "@/components/map/discover-map";
import { MapFloatingFilters } from "@/components/map/map-filters-panel";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { getMapboxPublicToken, getMapboxServerToken } from "@/lib/env";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return { title: t("nav.map") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MapPage({
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
  const mapboxToken = getMapboxPublicToken();
  const serverToken = getMapboxServerToken();
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const hasOrigin = result.origin.id !== "pending";
  const routeFrom = hasOrigin ? result.origin.name : "";
  const routeTo = result.destinations[0]?.name ?? "";

  const filterDefaults = {
    origin: flat.origin ?? parsed.origin,
    distance: parsed.distance,
    radiusKm: parsed.radiusKm,
    weatherGoal: parsed.weatherGoal,
    lat: parsed.lat,
    lon: parsed.lon,
    datePreset: parsed.datePreset,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-background text-on-background">
      <SideNav active="/map">
        <div className="mb-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <h1 className="text-xl font-semibold text-on-surface">
            {t("map.nearbyIdeal")}
          </h1>
          {!hasOrigin && (
            <p className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm text-on-surface-variant">
              {t("map.detecting")}
              <span className="mt-1 block">{t("map.waitingPlaces")}</span>
            </p>
          )}
          <div className="flex flex-col gap-3">
            {result.destinations.slice(0, 8).map((d) => (
              <Link
                key={d.id}
                href={`/destinations/${d.slug}?datePreset=${encodeURIComponent(parsed.datePreset)}&startDate=${result.startDate}&endDate=${result.endDate}`}
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
                  {t("map.kmAway", {
                    km: d.distanceKm,
                    temp: formatTemp(d.temperatureC),
                  })}
                </p>
                <span className="rounded-full bg-surface-container px-2 py-1 text-sm text-secondary">
                  {t("map.rainProbability", { pct: d.rainProbability })}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <Link
          href={
            routeFrom && routeTo
              ? `/routes?from=${encodeURIComponent(routeFrom)}&to=${encodeURIComponent(routeTo)}`
              : "/routes"
          }
          className="mt-4 block w-full shrink-0 rounded-lg bg-primary py-3 text-center text-xl font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
        >
          {t("map.generateRoute")}
        </Link>
      </SideNav>

      <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between bg-surface/80 px-margin-mobile shadow-[0px_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl md:hidden">
        <p className="text-2xl font-bold text-primary">{t("brand")}</p>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            aria-label={t("nav.profile")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-low text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              account_circle
            </span>
          </Link>
        </div>
      </header>

      <main id="main-content" className="relative z-0 h-full w-full pt-16 lg:pt-0 lg:pl-80">
        <DiscoverMap
          markers={hasOrigin ? result.mapMarkers : []}
          origin={hasOrigin ? result.origin : undefined}
          radiusKm={result.radiusKm}
          showRadius={hasOrigin}
          mapboxToken={mapboxToken}
          hasSecretToken={serverToken.startsWith("sk.")}
          className="absolute inset-0"
        />

        <div className="pointer-events-none absolute top-4 right-4 left-4 z-20 flex items-start justify-between gap-3 lg:left-[21rem]">
          <Suspense fallback={null}>
            <MapFloatingFilters
              defaults={filterDefaults}
              weatherGoal={parsed.weatherGoal}
            />
          </Suspense>

          <div className="pointer-events-auto hidden shrink-0 lg:block">
            <p className="rounded-xl border border-outline-variant/30 bg-surface/90 px-3 py-2 text-xs text-on-surface-variant shadow-sm backdrop-blur-xl">
              {hasOrigin
                ? result.origin.placeName
                : t("map.detecting")}
            </p>
          </div>
        </div>
      </main>

      <BottomNav active="/map" />
    </div>
  );
}
