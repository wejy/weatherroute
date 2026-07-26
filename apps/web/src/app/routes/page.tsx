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
import { RouteShareActions } from "@/components/routes/route-share-actions";
import { getEffectiveEarliestDepartureHour } from "@/server/dal/user-prefs";
import { WEATHER_TONE_COLORS } from "@/lib/weather-tone";

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
  const preferRaw = first(raw.prefer);
  const prefer = preferRaw === "weather" ? "weather" : "fast";
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
  const departurePrefs = await getEffectiveEarliestDepartureHour();
  const isPro = departurePrefs.tier === "pro";
  const route = await getRouteWeather(from, to, {
    fromLat,
    fromLon,
    toLat,
    toLon,
    fromId,
    toId,
    mode,
    locale,
    prefer,
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

  const shareWaypoints = route.waypoints
    .filter((wp) => wp.role === "midpoint")
    .map((wp) => ({ lat: wp.lat, lon: wp.lon }));

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
                key={`${route.from.id}-${route.to.id}-${mode}-${prefer}-${dateWindow.startDate}-${dateWindow.endDate}`}
                initialFrom={from}
                initialTo={to}
                fromPlace={route.from}
                toPlace={route.to}
                initialMode={mode}
                initialPrefer={prefer}
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

            {isPro ? (
              <RouteShareActions
                fromName={route.from.placeName}
                toName={route.to.placeName}
                origin={{ lat: route.from.lat, lon: route.from.lon }}
                destination={{ lat: route.to.lat, lon: route.to.lon }}
                waypoints={shareWaypoints}
                mode={mode}
                bestDeparture={route.bestDeparture}
                datePreset={dateWindow.preset}
                startDate={dateWindow.startDate}
                endDate={dateWindow.endDate}
                fromId={
                  isLinkableDestinationId(route.from.id) ? route.from.id : null
                }
                toId={
                  isLinkableDestinationId(route.to.id) ? route.to.id : null
                }
              />
            ) : null}

            <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5 shadow-sm">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold text-on-surface">
                  {t("routes.dryTrip")}
                </h3>
                <p className="mt-1 text-base text-on-surface-variant">
                  {t("routes.dryTripDesc")}
                </p>
                {route.prefer === "weather" &&
                (route.alternativesCompared ?? 0) > 1 ? (
                  <p className="mt-2 text-sm font-medium text-secondary">
                    {route.weatherRouteSelected
                      ? t("routes.weatherRouteAlt", {
                          n: route.alternativesCompared ?? 0,
                          extra:
                            route.minutesVsFastest && route.minutesVsFastest > 0
                              ? t("routes.minutesLonger", {
                                  m: route.minutesVsFastest,
                                })
                              : t("routes.sameDuration"),
                        })
                      : t("routes.weatherRouteSame")}
                  </p>
                ) : null}
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

            {route.alternatives && route.alternatives.length > 1 ? (
              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                <h3 className="mb-1 text-sm font-medium tracking-wider text-on-surface-variant uppercase">
                  {t("routes.alternativesTitle")}
                </h3>
                <p className="mb-3 text-xs text-on-surface-variant">
                  {t("routes.alternativesHint")}
                </p>
                <ul className="space-y-2">
                  {route.alternatives.map((alt, i) => (
                    <li
                      key={alt.index}
                      className={`rounded-lg border px-3 py-2.5 ${
                        alt.selected
                          ? "border-secondary/40 bg-secondary/10"
                          : "border-outline-variant/25 bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-on-surface">
                          {t("routes.alternativeLabel", { n: String(i + 1) })}
                          {alt.selected ? (
                            <span className="ml-2 text-xs font-medium text-secondary">
                              {t("routes.alternativeSelected")}
                            </span>
                          ) : (
                            <span className="ml-2 text-xs font-medium text-on-surface-variant">
                              {t("routes.alternativeOther")}
                            </span>
                          )}
                        </span>
                        <span className="text-sm tabular-nums text-on-surface">
                          {alt.dryness}% · {alt.durationLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {alt.distanceKm} km ·{" "}
                        {t("routes.alternativeAvgRain", {
                          pct: alt.avgRainProbability,
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

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

            {(() => {
              const allAdvisories = route.waypoints.flatMap((wp) =>
                wp.advisories.map((a) => ({ ...a, place: wp.name })),
              );
              // Dedupe by id+place
              const seen = new Set<string>();
              const unique = allAdvisories.filter((a) => {
                const key = `${a.id}:${a.place}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              if (unique.length === 0) return null;
              return (
                <div className="rounded-xl border border-error-container/40 bg-error-container/10 p-5">
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-medium tracking-wider text-error uppercase">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden>
                      warning
                    </span>
                    {t("routes.advisoriesTitle")}
                  </h3>
                  <p className="mb-3 text-xs text-on-surface-variant">
                    {t("routes.advisoriesHint")}
                  </p>
                  <ul className="space-y-3">
                    {unique.map((a) => (
                      <li key={`${a.id}-${a.place}`} className="flex gap-3">
                        <span
                          className={`material-symbols-outlined mt-0.5 ${
                            a.tone === "warning" ? "text-error" : "text-amber-600"
                          }`}
                          aria-hidden
                        >
                          {a.icon}
                        </span>
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              a.tone === "warning" ? "text-error" : "text-on-surface"
                            }`}
                          >
                            {a.title}
                            <span className="font-normal text-on-surface-variant">
                              {" "}
                              · {a.place}
                            </span>
                          </p>
                          <p className="text-[13px] text-on-surface-variant">
                            {a.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            <div className="relative mt-4 space-y-8 border-l-2 border-surface-variant pb-8 pl-4">
              {route.waypoints.map((wp) => (
                <div key={`${wp.role}-${wp.name}-${wp.lat}`} className="relative">
                  <div
                    className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-4 border-surface-bright ${
                      wp.condition === "storm"
                        ? "bg-error"
                        : wp.tone === "warning"
                          ? "bg-secondary"
                          : wp.tone === "caution"
                            ? "bg-amber-400"
                            : wp.role === "start"
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
                        className={
                          wp.condition === "storm"
                            ? "h-full bg-error"
                            : wp.tone === "warning"
                              ? "h-full bg-secondary"
                              : wp.tone === "caution"
                                ? "h-full bg-amber-400"
                                : "h-full bg-secondary"
                        }
                        style={{ width: `${wp.rainProbability}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[13px] text-on-surface-variant">
                      {t("routes.rainAmount")}:{" "}
                      <span className="font-semibold text-on-surface">
                        {t("routes.rainAmountValue", {
                          mm: wp.precipitationMm ?? 0,
                        })}
                      </span>
                    </p>
                  </div>
                  {wp.advisories.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {wp.advisories.map((a) => (
                        <li
                          key={a.id}
                          className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-[13px] ${
                            a.tone === "warning"
                              ? "bg-error-container/20 text-error"
                              : "bg-amber-400/15 text-on-surface"
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-[16px]"
                            aria-hidden
                          >
                            {a.icon}
                          </span>
                          <span>
                            <span className="font-semibold">{a.title}</span>
                            <span className="mt-0.5 block text-on-surface-variant">
                              {a.description}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
            alternatives={route.alternatives}
            mapboxToken={mapboxToken}
            className="absolute inset-0 h-full w-full"
          />

          <div className="pointer-events-none absolute top-6 right-6 z-10 rounded-xl border border-outline-variant/20 bg-surface/95 p-4 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <h2 className="mb-2 text-sm font-medium tracking-wider text-on-surface-variant uppercase">
              {t("routes.conditions")}
            </h2>
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: WEATHER_TONE_COLORS.clear }}
                  aria-hidden="true"
                />
                <span className="text-base text-on-surface">{t("routes.clearRoute")}</span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: WEATHER_TONE_COLORS.caution }}
                  aria-hidden="true"
                />
                <span className="text-base text-on-surface">{t("routes.cloudyCaution")}</span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: WEATHER_TONE_COLORS.warning }}
                  aria-hidden="true"
                />
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
