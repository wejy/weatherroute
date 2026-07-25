import { Suspense } from "react";
import { discoverQuerySchema } from "@/lib/validation/schemas";
import { discoverDestinations } from "@/server/services/weather-service";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { DiscoverSearch } from "@/components/discover/search-island";
import { DestinationCard } from "@/components/discover/destination-card";
import { WeatherFilters } from "@/components/discover/weather-filters";
import { DiscoverMap } from "@/components/map/discover-map";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { getMapboxPublicToken, getMapboxServerToken } from "@/lib/env";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator, translateCondition } from "@/i18n/translate";
import { resolveDateWindow, type DatePreset } from "@/lib/dates";

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
  const mapboxToken = getMapboxPublicToken();
  const serverToken = getMapboxServerToken();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = createTranslator(dict);
  const dateWindow = resolveDateWindow({
    preset: (result.datePreset as DatePreset) || "weekend",
    startDate: result.startDate,
    endDate: result.endDate,
    locale,
  });

  return (
    <>
      <TopNav active="/" />
      <main id="main-content" className="relative z-20 w-full pt-16 pb-24 md:pb-32">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="pointer-events-auto h-full w-full">
            <DiscoverMap
              markers={result.mapMarkers}
              origin={
                result.origin.id === "pending" ? undefined : result.origin
              }
              radiusKm={result.radiusKm}
              showRadius={result.origin.id !== "pending"}
              mapboxToken={mapboxToken}
              hasSecretToken={serverToken.startsWith("sk.")}
              className="h-full w-full opacity-90"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-surface/35 via-transparent to-surface/80" />
        </div>

        <div className="relative z-20 mx-auto w-full max-w-[1280px] px-margin-mobile md:px-margin-desktop">
          <section className="relative z-40 mt-8 mb-12 flex flex-col items-center text-center md:mt-12 md:mb-16">
            <div className="mb-8 inline-block max-w-4xl rounded-[2rem] border border-outline-variant/30 bg-surface/95 p-8 shadow-lg backdrop-blur-xl">
              <h1 className="mb-4 text-4xl leading-tight font-bold tracking-tight text-on-surface md:text-5xl md:leading-[56px]">
                {t("home.headline")}
                <br className="hidden md:block" /> {t("home.headlineBreak")}
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-on-surface-variant">
                {t("home.subhead")}
              </p>
            </div>

            <DiscoverSearch
              defaults={{
                origin: flat.origin ?? parsed.origin,
                distance: parsed.distance,
                radiusKm: parsed.radiusKm,
                weatherGoal: parsed.weatherGoal,
                lat: parsed.lat,
                lon: parsed.lon,
                datePreset: parsed.datePreset,
                startDate: parsed.startDate,
                endDate: parsed.endDate,
              }}
            />
          </section>

          <div className="relative z-30">
            <Suspense fallback={null}>
              <WeatherFilters active={parsed.weatherGoal} />
            </Suspense>
          </div>

          <section
            id="results"
            className="relative z-30 mx-auto mb-12 w-full max-w-5xl"
          >
            <div className="mb-6 rounded-2xl border border-outline-variant/30 bg-surface/95 p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl md:p-6">
              <h2 className="text-2xl font-semibold text-on-surface md:text-[32px] md:leading-10">
                {t("home.bestWeather")} · {dateWindow.label}
              </h2>
              <p className="mt-2 text-on-surface-variant">
                {result.origin.id === "pending" ? (
                  <>{t("home.waitingLocation")}</>
                ) : (
                  <>
                    {dateWindow.rangeLabel} ·{" "}
                    {t("home.withinOf", {
                      radius: result.radiusKm.toLocaleString(locale === "fi" ? "fi-FI" : "en-GB"),
                      place: result.origin.placeName,
                    })}
                    {result.destinations.length > 0
                      ? ` · ${t("home.places", { count: result.destinations.length })}`
                      : ""}
                  </>
                )}
              </p>

              {(result.originCurrent || result.originForecast) && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {result.originCurrent && (
                    <div className="inline-flex items-center gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/90 px-4 py-3 text-left">
                      <span
                        className={`material-symbols-outlined fill-icon text-2xl ${weatherIconClass(result.originCurrent.condition)}`}
                        aria-hidden="true"
                      >
                        {weatherIcon(result.originCurrent.condition)}
                      </span>
                      <div>
                        <p className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
                          {t("home.nowIn", { name: result.origin.name })}
                        </p>
                        <p className="font-semibold text-on-surface">
                          {formatTemp(result.originCurrent.temperatureC)}C ·{" "}
                          {translateCondition(
                            dict,
                            result.originCurrent.condition,
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {result.originForecast && (
                    <div className="inline-flex items-center gap-3 rounded-2xl border border-outline-variant/20 bg-secondary/10 px-4 py-3 text-left">
                      <span
                        className={`material-symbols-outlined fill-icon text-2xl ${weatherIconClass(result.originForecast.condition)}`}
                        aria-hidden="true"
                      >
                        {weatherIcon(result.originForecast.condition)}
                      </span>
                      <div>
                        <p className="text-xs font-medium tracking-wide text-secondary uppercase">
                          {t("home.forecastIn", {
                            label: dateWindow.label,
                            name: result.origin.name,
                          })}
                        </p>
                        <p className="font-semibold text-on-surface">
                          {formatTemp(result.originForecast.tempMinC)}–
                          {formatTemp(result.originForecast.tempMaxC)}C ·{" "}
                          {translateCondition(
                            dict,
                            result.originForecast.condition,
                          )}
                          <span className="font-normal text-on-surface-variant">
                            {" "}
                            ·{" "}
                            {t("home.rain", {
                              pct: result.originForecast.rainProbability,
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              {result.destinations.slice(0, 9).map((dest) => (
                <DestinationCard key={dest.id} destination={dest} />
              ))}
            </div>
            {result.destinations.length === 0 && (
              <p className="rounded-2xl border border-outline-variant/20 bg-surface/90 p-8 text-center text-on-surface-variant backdrop-blur-xl">
                {result.origin.id === "pending"
                  ? t("home.detecting")
                  : t("home.noDestinations")}
              </p>
            )}
          </section>
        </div>
      </main>
      <BottomNav active="/" />
    </>
  );
}
