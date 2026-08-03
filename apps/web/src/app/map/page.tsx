import Link from "next/link";
import { Suspense } from "react";
import { discoverDestinations } from "@/server/services/weather-service";
import { discoverQuerySchema } from "@/lib/validation/schemas";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNav } from "@/components/layout/top-nav";
import { DiscoverMap } from "@/components/map/discover-map";
import { MapFloatingFilters } from "@/components/map/map-filters-panel";
import { SoftPaywall } from "@/components/discover/soft-paywall";
import { ShareTokenRedeemer } from "@/components/discover/share-token-redeemer";
import { getMapboxPublicToken, getMapboxServerToken } from "@/lib/env";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { destinationHref, routesHref } from "@/lib/discover-query";
import { MapNearbyCard } from "@/components/map/map-nearby-card";
import {
  gateDiscoverAccess,
  isActiveDiscoverQuery,
} from "@/server/dal/discover-gate";
import { resolveDiscoverLimits } from "@/server/dal/discover-limits";

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
  const active = isActiveDiscoverQuery(parsed);
  const gate = await gateDiscoverAccess({
    consume: active,
    meta: {
      origin: parsed.origin,
      weatherGoal: parsed.weatherGoal,
      path: "/map",
    },
  });
  const { tier } = await resolveDiscoverLimits();

  const result = gate.paywalled
    ? await discoverDestinations(
        { ...parsed, origin: undefined, lat: undefined, lon: undefined },
        locale,
      )
    : await discoverDestinations(parsed, locale);

  const mapboxToken = getMapboxPublicToken();
  const serverToken = getMapboxServerToken();
  const t = createTranslator(getDictionary(locale));
  const hasOrigin = result.origin.id !== "pending" && !gate.paywalled;
  const routeFrom = hasOrigin ? result.origin.name : "";
  const routeTo = result.destinations[0]?.name ?? "";
  const originQuery = {
    origin:
      flat.origin ??
      parsed.origin ??
      (hasOrigin ? result.origin.name : undefined),
    lat: parsed.lat ?? (hasOrigin ? result.origin.lat : undefined),
    lon: parsed.lon ?? (hasOrigin ? result.origin.lon : undefined),
    datePreset: parsed.datePreset,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    distance: result.distance,
    radiusKm: result.radiusKm,
    weatherGoal: parsed.weatherGoal,
    mode: parsed.mode,
  };
  const filterDefaults = {
    origin: flat.origin ?? parsed.origin,
    distance: result.distance,
    radiusKm: result.radiusKm,
    weatherGoal: parsed.weatherGoal,
    lat: parsed.lat,
    lon: parsed.lon,
    datePreset: parsed.datePreset,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    mode: parsed.mode,
  };
  const shareToken =
    typeof flat.share === "string" ? flat.share : undefined;
  const routeHref =
    routeFrom && routeTo
      ? routesHref({
          from: routeFrom,
          to: routeTo,
          ...filterDefaults,
        })
      : routesHref(filterDefaults);

  return (
    <div
      data-testid="map-page"
      className="h-[100dvh] w-full overflow-hidden bg-background text-on-background"
    >
      <SideNav active="/map">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <h1 className="mb-3 shrink-0 text-xl font-semibold text-on-surface">
            {t("map.nearbyIdeal")}
          </h1>
          <Suspense fallback={null}>
            <ShareTokenRedeemer />
          </Suspense>
          {gate.paywalled ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <SoftPaywall
                quota={
                  gate.quota
                    ? {
                        remaining: gate.quota.remaining,
                        limit: gate.quota.limit,
                        searchesUsed: gate.quota.searchesUsed,
                        bonusCredits: gate.quota.bonusCredits,
                      }
                    : null
                }
                initialShareToken={shareToken}
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {!hasOrigin && (
                <p className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm text-on-surface-variant">
                  {t("map.detecting")}
                  <span className="mt-1 block">{t("map.waitingPlaces")}</span>
                </p>
              )}
              <div className="flex flex-col gap-3 pb-1">
                {result.destinations.map((d) => (
                  <MapNearbyCard
                    key={d.id}
                    destination={d}
                    href={destinationHref(d.slug, {
                      ...originQuery,
                    })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        {!gate.paywalled ? (
          <Link
            href={routeHref}
            className="mt-3 block w-full shrink-0 rounded-lg bg-accent py-3 text-center text-lg font-semibold text-on-accent shadow-sm transition-colors hover:bg-accent-container hover:text-on-accent-container"
          >
            {t("map.generateRoute")}
          </Link>
        ) : null}
      </SideNav>

      <header className="fixed top-0 left-0 z-50 flex h-14 w-full items-center justify-between bg-surface/85 px-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl lg:hidden">
        <p className="text-xl font-bold text-primary">{t("brand")}</p>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/settings"
            aria-label={t("nav.sideSettings")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-low text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              settings
            </span>
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className="relative z-0 h-full w-full pt-14 pb-[4.5rem] lg:pt-0 lg:pb-0 lg:pl-96"
      >
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

        {/* Map chrome: filters + origin (one instance for mobile + desktop) */}
        <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex items-start justify-between gap-2 px-3 pt-3 lg:top-0 lg:right-14 lg:left-[25rem] lg:pt-2.5">
          <Suspense fallback={null}>
            <MapFloatingFilters
              defaults={filterDefaults}
              weatherGoal={parsed.weatherGoal}
              tier={tier}
            />
          </Suspense>
          <div className="pointer-events-auto max-w-[45%] shrink-0 lg:max-w-none">
            <p className="truncate rounded-full border border-outline-variant/30 bg-surface/90 px-3 py-2 text-xs font-medium text-on-surface-variant shadow-sm backdrop-blur-xl lg:rounded-xl">
              {hasOrigin ? result.origin.placeName : t("map.detecting")}
            </p>
          </div>
        </div>

        {gate.paywalled ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-20 px-3 lg:hidden">
            <div className="pointer-events-auto max-h-[50vh] overflow-y-auto rounded-2xl border border-outline-variant/25 bg-surface/95 p-3 shadow-lg backdrop-blur-xl">
              <SoftPaywall
                quota={
                  gate.quota
                    ? {
                        remaining: gate.quota.remaining,
                        limit: gate.quota.limit,
                        searchesUsed: gate.quota.searchesUsed,
                        bonusCredits: gate.quota.bonusCredits,
                      }
                    : null
                }
                initialShareToken={shareToken}
              />
            </div>
          </div>
        ) : null}

        {hasOrigin && !gate.paywalled ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-20 px-3 lg:hidden">
            <Link
              href={routeHref}
              className="pointer-events-auto flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-on-accent shadow-[0px_8px_24px_rgba(0,0,0,0.18)] transition-colors hover:bg-accent-container"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                route
              </span>
              {t("map.generateRoute")}
            </Link>
          </div>
        ) : null}

        {!hasOrigin && !gate.paywalled ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] z-20 px-4 lg:hidden">
            <p className="pointer-events-auto rounded-xl border border-outline-variant/30 bg-surface/95 px-4 py-3 text-center text-sm text-on-surface-variant shadow-md backdrop-blur-xl">
              {t("map.detecting")}
              <span className="mt-1 block text-xs">{t("map.waitingPlaces")}</span>
            </p>
          </div>
        ) : null}
      </main>

      <BottomNav active="/map" />
    </div>
  );
}
