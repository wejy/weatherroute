import Link from "next/link";
import { Suspense } from "react";
import { discoverDestinations } from "@/server/services/weather-service";
import { discoverQuerySchema } from "@/lib/validation/schemas";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNav } from "@/components/layout/top-nav";
import { DiscoverMap } from "@/components/map/discover-map";
import { MapFloatingFilters } from "@/components/map/map-filters-panel";
import { getMapboxPublicToken, getMapboxServerToken } from "@/lib/env";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { destinationHref, routesHref } from "@/lib/discover-query";
import { MapNearbyCard } from "@/components/map/map-nearby-card";

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
  const locale = await getLocale();
  const result = await discoverDestinations(parsed, locale);
  const mapboxToken = getMapboxPublicToken();
  const serverToken = getMapboxServerToken();
  const t = createTranslator(getDictionary(locale));
  const hasOrigin = result.origin.id !== "pending";
  const routeFrom = hasOrigin ? result.origin.name : "";
  const routeTo = result.destinations[0]?.name ?? "";
  const originQuery = {
    origin: flat.origin ?? parsed.origin ?? (hasOrigin ? result.origin.name : undefined),
    lat: parsed.lat ?? (hasOrigin ? result.origin.lat : undefined),
    lon: parsed.lon ?? (hasOrigin ? result.origin.lon : undefined),
    mode: parsed.mode,
  };

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
    mode: parsed.mode,
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-background text-on-background">
      <SideNav active="/map">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <h1 className="mb-3 shrink-0 text-xl font-semibold text-on-surface">
            {t("map.nearbyIdeal")}
          </h1>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {!hasOrigin && (
              <p className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm text-on-surface-variant">
                {t("map.detecting")}
                <span className="mt-1 block">{t("map.waitingPlaces")}</span>
              </p>
            )}
            <div className="flex flex-col gap-3 pb-1">
              {result.destinations.slice(0, 8).map((d) => (
                <MapNearbyCard
                  key={d.id}
                  destination={d}
                  href={destinationHref(d.slug, {
                    datePreset: parsed.datePreset,
                    startDate: result.startDate,
                    endDate: result.endDate,
                    ...originQuery,
                  })}
                />
              ))}
            </div>
          </div>
        </div>
        <Link
          href={
            routeFrom && routeTo
              ? routesHref({
                  from: routeFrom,
                  to: routeTo,
                  ...originQuery,
                })
              : routesHref(originQuery)
          }
          className="mt-3 block w-full shrink-0 rounded-lg bg-primary py-3 text-center text-lg font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
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

      <main id="main-content" className="relative z-0 h-full w-full pt-16 lg:pt-0 lg:pl-96">
        <DiscoverMap
          markers={hasOrigin ? result.mapMarkers : []}
          origin={hasOrigin ? result.origin : undefined}
          radiusKm={result.radiusKm}
          showRadius={hasOrigin}
          mapboxToken={mapboxToken}
          hasSecretToken={serverToken.startsWith("sk.")}
          locationQuery={originQuery}
          className="absolute inset-0"
        />

        {/* Below lg the side nav is hidden — show nearby cards + charts here */}
        {hasOrigin && result.destinations.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 lg:hidden">
            <div className="pointer-events-auto flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {result.destinations.slice(0, 8).map((d) => (
                <MapNearbyCard
                  key={`m-${d.id}`}
                  destination={d}
                  compact
                  href={destinationHref(d.slug, {
                    datePreset: parsed.datePreset,
                    startDate: result.startDate,
                    endDate: result.endDate,
                    ...originQuery,
                  })}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute top-4 right-4 left-4 z-20 flex items-start justify-between gap-3 lg:left-[25rem]">
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
