import Link from "next/link";
import { Suspense } from "react";
import { getRouteWeather } from "@/server/services/location-service";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNav } from "@/components/layout/top-nav";
import { RouteMap } from "@/components/map/route-map";
import { RouteEndpointsForm } from "@/components/routes/route-endpoints-form";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { getMapboxPublicToken } from "@/lib/env";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return { title: t("nav.routes") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseCoord(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const from =
    first(raw.from)?.trim() || first(raw.origin)?.trim() || "Helsinki";
  const to = first(raw.to)?.trim() || "Tampere";
  const fromLat = parseCoord(first(raw.fromLat)) ?? parseCoord(first(raw.lat));
  const fromLon = parseCoord(first(raw.fromLon)) ?? parseCoord(first(raw.lon));
  const toLat = parseCoord(first(raw.toLat));
  const toLon = parseCoord(first(raw.toLon));
  const modeRaw = first(raw.mode);
  const mode =
    modeRaw === "cycling" || modeRaw === "driving" ? modeRaw : "driving";

  const route = await getRouteWeather(from, to, {
    fromLat,
    fromLon,
    toLat,
    toLon,
    mode,
  });
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const mapboxToken = getMapboxPublicToken();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SideNav active="/routes" />

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

      <main id="main-content" className="relative flex h-full w-full flex-1 flex-col pt-16 md:flex-row md:pt-0 lg:ml-96">
        <section className="z-10 flex max-h-[48vh] w-full shrink-0 flex-col overflow-y-auto bg-surface-bright shadow-[10px_0_30px_rgba(0,0,0,0.03)] md:max-h-none md:h-full md:w-2/5 lg:w-[450px]">
          <div className="flex flex-col gap-8 p-6 md:p-8">
            <div>
              <h1 className="mb-2 text-[32px] leading-10 font-semibold text-on-surface">
                {route.title}
              </h1>
              <div className="flex items-center gap-4 text-sm font-medium text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">
                    directions_car
                  </span>
                  {route.distanceKm} km
                </span>
                <span className="h-1 w-1 rounded-full bg-outline-variant" />
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">
                    schedule
                  </span>
                  {route.durationLabel}
                </span>
              </div>
            </div>

            <Suspense fallback={null}>
              <RouteEndpointsForm
                key={`${route.from.id}-${route.to.id}-${mode}`}
                initialFrom={from}
                initialTo={to}
                fromPlace={route.from}
                toPlace={route.to}
                initialMode={mode}
              />
            </Suspense>

            <div className="flex items-center justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low p-5 shadow-sm">
              <div>
                <h3 className="text-xl font-semibold text-on-surface">
                  {t("routes.dryTrip")}
                </h3>
                <p className="mt-1 text-base text-on-surface-variant">
                  {t("routes.dryTripDesc")}
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-tertiary-container/20 bg-tertiary-container/10 text-2xl font-semibold text-tertiary-container">
                {route.dryTripGuarantee}%
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-secondary/20 bg-secondary/5 p-5">
              <span
                className="material-symbols-outlined mt-1 text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                lightbulb
              </span>
              <div>
                <h4 className="mb-1 text-sm font-medium tracking-wider text-on-secondary-container uppercase">
                  {t("routes.bestDeparture")}
                </h4>
                <p className="text-base text-on-surface">{route.departureHint}</p>
              </div>
            </div>

            <div className="relative mt-4 space-y-8 border-l-2 border-surface-variant pb-8 pl-4">
              {route.waypoints.map((wp) => (
                <div key={wp.name} className="relative">
                  <div
                    className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-4 border-surface-bright ${
                      wp.role === "start"
                        ? "bg-primary"
                        : wp.role === "destination"
                          ? "bg-tertiary"
                          : "bg-outline"
                    }`}
                  />
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h5 className="text-xl font-semibold text-on-surface">
                        {wp.name}
                      </h5>
                      <span className="text-sm font-medium text-on-surface-variant">
                        {wp.timeLabel}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-semibold text-on-surface">
                        {formatTemp(wp.temperatureC)}
                      </span>
                      <span
                        className={`material-symbols-outlined ${weatherIconClass(wp.condition)}`}
                      >
                        {weatherIcon(wp.condition)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg bg-surface-container p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-on-surface-variant">
                        {t("routes.rainProbability")}
                      </span>
                      <span className="text-[13px] font-semibold tracking-wider text-on-surface">
                        {wp.rainProbability}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
                      <div
                        className="h-full bg-secondary"
                        style={{ width: `${wp.rainProbability}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="relative min-h-[52vh] flex-1 overflow-hidden bg-surface-container-low md:min-h-0 md:h-full"
          aria-label={route.title}
        >
          <RouteMap
            from={route.from}
            to={route.to}
            waypoints={route.waypoints}
            geometry={route.geometry}
            mapboxToken={mapboxToken}
            className="absolute inset-0 h-full w-full"
          />

          <div className="pointer-events-none absolute top-6 right-6 z-10 rounded-xl border border-outline-variant/20 bg-surface/95 p-4 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <h2 className="mb-2 text-sm font-medium tracking-wider text-on-surface-variant uppercase">
              {t("routes.conditions")}
            </h2>
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-tertiary-fixed-dim" aria-hidden="true" />
                <span className="text-base text-on-surface">{t("routes.clearRoute")}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400" aria-hidden="true" />
                <span className="text-base text-on-surface">{t("routes.cloudyCaution")}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-error" aria-hidden="true" />
                <span className="text-base text-on-surface">{t("routes.rainWarning")}</span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <BottomNav active="/routes" />
    </div>
  );
}
