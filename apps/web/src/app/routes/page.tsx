import Link from "next/link";
import { Suspense } from "react";
import { getRouteWeather } from "@/server/services/location-service";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNav } from "@/components/layout/top-nav";
import { RouteMap } from "@/components/map/route-map";
import { RouteEndpointsForm } from "@/components/routes/route-endpoints-form";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { travelModeIcon } from "@/lib/types";
import { getMapboxPublicToken } from "@/lib/env";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { saveTripAction } from "@/server/actions/trips";
import { getCurrentUser } from "@/server/auth/session";
import {
  destinationHref,
  isLinkableDestinationId,
} from "@/lib/discover-query";
import { resolveDateWindow, type DatePreset } from "@/lib/dates";

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
  const fromId = first(raw.fromId)?.trim();
  const toId = first(raw.toId)?.trim();
  const modeRaw = first(raw.mode);
  const mode =
    modeRaw === "cycling" || modeRaw === "driving" ? modeRaw : "driving";
  const datePresetRaw = first(raw.datePreset);
  const datePreset: DatePreset =
    datePresetRaw === "today" ||
    datePresetRaw === "tomorrow" ||
    datePresetRaw === "weekend" ||
    datePresetRaw === "custom"
      ? datePresetRaw
      : first(raw.startDate)
        ? "custom"
        : "weekend";
  const startDateParam = first(raw.startDate) || null;
  const endDateParam = first(raw.endDate) || null;

  const locale = await getLocale();
  const dateWindow = resolveDateWindow({
    preset: datePreset,
    startDate: startDateParam ?? undefined,
    endDate: endDateParam ?? startDateParam ?? undefined,
    locale,
  });
  const { getEffectiveEarliestDepartureHour } = await import(
    "@/server/dal/user-prefs"
  );
  const departurePrefs = await getEffectiveEarliestDepartureHour();
  const route = await getRouteWeather(from, to, {
    fromLat,
    fromLon,
    toLat,
    toLon,
    fromId,
    toId,
    mode,
    locale,
    earliestDepartureHour: departurePrefs.effectiveHour,
    datePreset: dateWindow.preset,
    startDate: dateWindow.startDate,
    endDate: dateWindow.endDate,
  });
  const t = createTranslator(getDictionary(locale));
  const mapboxToken = getMapboxPublicToken();
  const user = await getCurrentUser();

  // TODO: Let users set earliest departure on this page per trip (overrides
  // the Pro settings default). Wire via search param e.g. `earliestHour`.

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SideNav active="/routes" />

      <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between bg-surface/80 px-margin-mobile shadow-[0px_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl md:hidden">
        <p className="text-2xl font-bold text-primary">{t("brand")}</p>
        <div className="flex items-center gap-3">
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

      <main id="main-content" className="relative flex h-full w-full flex-1 flex-col pt-16 md:flex-row md:pt-0 lg:ml-96">
        <section className="z-10 flex max-h-[48vh] w-full shrink-0 flex-col overflow-y-auto bg-surface-bright shadow-[10px_0_30px_rgba(0,0,0,0.03)] md:max-h-none md:h-full md:w-2/5 lg:w-[450px]">
          <div className="flex flex-col gap-8 p-6 md:p-8">
            <div>
              <h1 className="mb-2 text-[32px] leading-10 font-semibold text-on-surface">
                {route.title}
              </h1>
              <div className="flex items-center gap-4 text-sm font-medium text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    straighten
                  </span>
                  {route.distanceKm} km
                </span>
                <span className="h-1 w-1 rounded-full bg-outline-variant" />
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    {travelModeIcon(mode)}
                  </span>
                  {route.durationLabel}
                </span>
              </div>
            </div>

            <Suspense fallback={null}>
              <RouteEndpointsForm
                key={`${route.from.id}-${route.to.id}-${mode}-${dateWindow.startDate}-${dateWindow.endDate}`}
                initialFrom={from}
                initialTo={to}
                fromPlace={route.from}
                toPlace={route.to}
                initialMode={mode}
                initialDatePreset={dateWindow.preset}
                initialStartDate={dateWindow.startDate}
                initialEndDate={dateWindow.endDate}
              />
            </Suspense>

            {user ? (
              <form action={saveTripAction}>
                <input
                  type="hidden"
                  name="title"
                  value={`${route.from.name} → ${route.to.name}`}
                />
                <input type="hidden" name="originName" value={route.from.placeName} />
                <input
                  type="hidden"
                  name="destinationName"
                  value={route.to.placeName}
                />
                <input type="hidden" name="destinationLat" value={route.to.lat} />
                <input type="hidden" name="destinationLon" value={route.to.lon} />
                <input type="hidden" name="originLat" value={route.from.lat} />
                <input type="hidden" name="originLon" value={route.from.lon} />
                <input type="hidden" name="weatherGoal" value="best" />
                <input type="hidden" name="travelMode" value={mode} />
                <input type="hidden" name="datePreset" value={dateWindow.preset} />
                <input type="hidden" name="startDate" value={dateWindow.startDate} />
                <input type="hidden" name="endDate" value={dateWindow.endDate} />
                <input type="hidden" name="distanceKm" value={route.distanceKm} />
                <input
                  type="hidden"
                  name="durationLabel"
                  value={route.durationLabel}
                />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    bookmark
                  </span>
                  {t("routes.saveRoute")}
                </button>
              </form>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/routes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&mode=${mode}`)}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  bookmark
                </span>
                {t("routes.saveRouteSignIn")}
              </Link>
            )}

            <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5 shadow-sm">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold text-on-surface">
                  {t("routes.dryTrip")}
                </h3>
                <p className="mt-1 text-base text-on-surface-variant">
                  {t("routes.dryTripDesc")}
                </p>
              </div>
              <div
                className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-full border-4 border-tertiary-container/20 bg-tertiary-container/10 text-tertiary-container"
                aria-label={`${route.dryTripGuarantee}%`}
              >
                <span className="text-xl font-semibold leading-none tabular-nums">
                  {route.dryTripGuarantee}
                </span>
                <span className="mt-0.5 text-[11px] font-semibold leading-none tracking-wide">
                  %
                </span>
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
              <div className="min-w-0">
                <h4 className="mb-1 text-sm font-medium tracking-wider text-on-secondary-container uppercase">
                  {t("routes.bestDeparture")}
                </h4>
                <p className="text-2xl font-semibold tabular-nums text-on-surface">
                  {route.bestDeparture}
                </p>
                <p className="mt-1 text-base text-on-surface-variant">
                  {route.departureHint}
                </p>
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
                        {wp.role === "destination" &&
                        isLinkableDestinationId(route.to.id) ? (
                          <Link
                            href={destinationHref(route.to.id, {
                              datePreset: dateWindow.preset,
                              startDate: dateWindow.startDate,
                              endDate: dateWindow.endDate,
                              origin: route.from.placeName,
                              lat: route.from.lat,
                              lon: route.from.lon,
                              mode,
                            })}
                            className="text-on-surface underline-offset-2 hover:text-secondary hover:underline"
                          >
                            {wp.name}
                          </Link>
                        ) : (
                          wp.name
                        )}
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
