import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  buildSuitability,
  getDestinationBySlug,
  getWeatherForPlace,
  summarizePeriod,
} from "@/server/services/weather-service";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { ForecastCharts } from "@/components/destinations/forecast-charts";
import { DestinationWikipedia } from "@/components/destinations/destination-wikipedia";
import { DestinationDateFilters } from "@/components/destinations/date-filters";
import { saveTripAction } from "@/server/actions/trips";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import {
  resolveDateWindow,
  type DatePreset,
} from "@/lib/dates";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator, translateCondition, translateUv } from "@/i18n/translate";
import { routesHref } from "@/lib/discover-query";
import { haversineKm } from "@/server/integrations/mocks/data";
import { getDestinationWikipediaSummary } from "@/server/services/destination-wikipedia";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseDatePreset(raw: string | undefined): DatePreset | undefined {
  if (
    raw === "today" ||
    raw === "tomorrow" ||
    raw === "weekend" ||
    raw === "custom"
  ) {
    return raw;
  }
  return undefined;
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const dest = await getDestinationBySlug(slug);
  return { title: dest ? `${dest.name} Forecast` : "Destination" };
}

export default async function DestinationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const raw = await searchParams;
  const startDate = first(raw.startDate);
  const endDate = first(raw.endDate);
  const datePreset =
    parseDatePreset(first(raw.datePreset)) ??
    (startDate ? "custom" : "weekend");
  const originName = first(raw.origin) || first(raw.from) || "";
  const originLatRaw = first(raw.lat) ?? first(raw.fromLat);
  const originLonRaw = first(raw.lon) ?? first(raw.fromLon);
  const parsedOriginLat = originLatRaw != null ? Number(originLatRaw) : NaN;
  const parsedOriginLon = originLonRaw != null ? Number(originLonRaw) : NaN;
  const hasOriginCoords =
    Number.isFinite(parsedOriginLat) && Number.isFinite(parsedOriginLon);
  const originLat = hasOriginCoords ? parsedOriginLat : null;
  const originLon = hasOriginCoords ? parsedOriginLon : null;
  const modeRaw = first(raw.mode);
  const mode =
    modeRaw === "cycling" || modeRaw === "driving" ? modeRaw : "driving";

  const dest = await getDestinationBySlug(slug);
  if (!dest) notFound();

  const distanceKm =
    hasOriginCoords && originLat != null && originLon != null
      ? Math.round(
          haversineKm(
            { lat: originLat, lon: originLon },
            { lat: dest.lat, lon: dest.lon },
          ),
        )
      : 0;

  const locale = await getLocale();
  const wikiLang = locale === "fi" ? "fi" : "en";
  const weather = await getWeatherForPlace({
    lat: dest.lat,
    lon: dest.lon,
    name: dest.placeName,
    locale,
  });
  const wikipedia = await getDestinationWikipediaSummary({
    placeId: dest.id,
    name: dest.placeName,
    lat: dest.lat,
    lon: dest.lon,
    lang: wikiLang,
  });
  const dict = getDictionary(locale);
  const t = createTranslator(dict);

  const window = resolveDateWindow({
    preset: datePreset,
    startDate,
    endDate: endDate || startDate,
    locale,
  });
  const badges = buildSuitability(weather, t, locale, {
    startDate: window.startDate,
    endDate: window.endDate,
  });
  const period = summarizePeriod(weather, window);
  // Charts keep a longer horizon from “today”; trip window is only highlighted.
  const chartDays = weather.daily.slice(0, 10);
  const countryLabel =
    dest.country === "Suomi" || dest.country === "Finland"
      ? t("destination.finland")
      : dest.country;

  return (
    <>
      <TopNav active="/" />
      <main id="main-content" className="mx-auto max-w-[1280px] space-y-8 px-margin-mobile pt-24 pb-24 md:px-margin-desktop">
        <section className="relative flex h-[400px] w-full flex-col justify-end overflow-hidden rounded-xl bg-surface-container-low p-8 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] md:h-[500px]">
          <Image
            src={dest.imageUrl}
            alt={dest.placeName}
            fill
            unoptimized={
              dest.imageUrl.startsWith("http://") ||
              dest.imageUrl.startsWith("https://")
            }
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-inverse-surface/80 via-inverse-surface/30 to-transparent" />
          <div className="relative z-20 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="text-inverse-on-surface">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                {dest.name}, {countryLabel}
              </h1>
              <p className="mt-2 text-lg text-inverse-on-surface/80">
                {t("destination.nowPrefix")}{" "}
                {translateCondition(dict, weather.current.condition)} •{" "}
                {t("destination.feelsLike", {
                  temp: formatTemp(weather.current.feelsLikeC),
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className="material-symbols-outlined text-[64px] text-secondary-fixed-dim"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {weatherIcon(weather.current.condition)}
              </span>
              <span className="text-4xl font-bold text-inverse-on-surface md:text-5xl">
                {formatTemp(weather.current.temperatureC)}C
              </span>
            </div>
          </div>
        </section>

        <Suspense
          fallback={
            <div className="h-28 animate-pulse rounded-xl bg-surface-container" />
          }
        >
          <DestinationDateFilters
            key={`${window.preset}-${window.startDate}-${window.endDate}`}
            initial={window}
          />
        </Suspense>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <p className="text-sm font-medium tracking-wide text-on-surface-variant uppercase">
              {t("destination.currentConditions")}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={`material-symbols-outlined fill-icon text-3xl ${weatherIconClass(weather.current.condition)}`}
              >
                {weatherIcon(weather.current.condition)}
              </span>
              <div>
                <p className="text-2xl font-semibold text-on-surface">
                  {formatTemp(weather.current.temperatureC)}C
                </p>
                <p className="text-on-surface-variant">
                  {translateCondition(dict, weather.current.condition)} ·{" "}
                  {t("home.rain", {
                    pct: weather.current.precipitationProbability,
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <p className="text-sm font-medium tracking-wide text-primary uppercase">
              {t("destination.forecast")} · {period.rangeLabel}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={`material-symbols-outlined fill-icon text-3xl ${weatherIconClass(period.condition)}`}
              >
                {weatherIcon(period.condition)}
              </span>
              <div>
                <p className="text-2xl font-semibold text-on-surface">
                  {formatTemp(period.tempMinC)}–{formatTemp(period.tempMaxC)}C
                </p>
                <p className="text-on-surface-variant">
                  {translateCondition(dict, period.condition)} ·{" "}
                  {t("destination.peakRain", {
                    pct: period.peakRainProbability,
                  })}
                  {period.peakRainProbability !== period.rainProbability
                    ? ` · ${t("destination.avgRain", { pct: period.rainProbability })}`
                    : ""}{" "}
                  · {t("destination.sunScore", { score: period.sunshineScore })}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <ForecastCharts
              key={`charts-${period.startDate}-${period.endDate}`}
              days={chartDays}
              periodStart={period.startDate}
              periodEnd={period.endDate}
              provider={weather.provider}
              hourly={weather.hourly}
            />

            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                {
                  icon: "air",
                  label: t("destination.wind"),
                  value: `${Math.round(weather.current.windSpeedKmh)} km/h`,
                },
                {
                  icon: "humidity_percentage",
                  label: t("destination.humidity"),
                  value: `${weather.current.humidity}%`,
                },
                {
                  icon: "visibility",
                  label: t("destination.visibility"),
                  value: `${weather.current.visibilityKm} km`,
                },
                {
                  icon: "device_thermostat",
                  label: t("destination.uvIndex"),
                  value: `${weather.current.uvIndex} · ${translateUv(dict, weather.current.uvIndex)}`,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="flex flex-col items-center rounded-xl border border-surface-variant bg-surface-container-lowest p-4 text-center shadow-[0px_4px_20px_rgba(0,0,0,0.05)]"
                >
                  <span className="material-symbols-outlined mb-2 text-primary">
                    {m.icon}
                  </span>
                  <span className="text-sm font-medium text-on-surface-variant">
                    {m.label}
                  </span>
                  <span className="text-xl font-semibold text-on-surface">
                    {m.value}
                  </span>
                </div>
              ))}
            </section>

            {wikipedia ? (
              <DestinationWikipedia
                summary={wikipedia}
                title={t("destination.wikipediaTitle", { place: dest.name })}
                linkLabel={t("destination.wikipediaLink")}
              />
            ) : null}
          </div>

          <div className="space-y-8 lg:col-span-4">
            <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-on-surface">
                <span
                  className="material-symbols-outlined text-tertiary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                {t("destination.tripSuitability")}
              </h2>
              <div className="space-y-4">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-4 rounded-lg border p-4 ${
                      badge.tone === "success"
                        ? "border-tertiary-container/20 bg-tertiary-container/10"
                        : badge.tone === "warning"
                          ? "border-error-container/40 bg-error-container/20"
                          : "border-primary-container/20 bg-primary-container/10"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${
                        badge.tone === "success"
                          ? "text-tertiary-container"
                          : badge.tone === "warning"
                            ? "text-error"
                            : "text-primary"
                      }`}
                    >
                      {badge.icon}
                    </span>
                    <div>
                      <h3
                        className={`text-sm font-semibold ${
                          badge.tone === "warning"
                            ? "text-error"
                            : "text-on-surface"
                        }`}
                      >
                        {badge.title}
                      </h3>
                      <p className="mt-0.5 text-[13px] text-on-surface-variant">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              {originName ? (
                <form action={saveTripAction}>
                  <input
                    type="hidden"
                    name="title"
                    value={`Trip to ${dest.name}`}
                  />
                  <input type="hidden" name="originName" value={originName} />
                  <input
                    type="hidden"
                    name="destinationName"
                    value={dest.placeName}
                  />
                  <input type="hidden" name="destinationLat" value={dest.lat} />
                  <input type="hidden" name="destinationLon" value={dest.lon} />
                  {originLat != null ? (
                    <input type="hidden" name="originLat" value={originLat} />
                  ) : null}
                  {originLon != null ? (
                    <input type="hidden" name="originLon" value={originLon} />
                  ) : null}
                  <input type="hidden" name="weatherGoal" value="best" />
                  <input type="hidden" name="travelMode" value={mode} />
                  <input type="hidden" name="datePreset" value={datePreset} />
                  {window.startDate ? (
                    <input
                      type="hidden"
                      name="startDate"
                      value={window.startDate}
                    />
                  ) : null}
                  {window.endDate ? (
                    <input
                      type="hidden"
                      name="endDate"
                      value={window.endDate}
                    />
                  ) : null}
                  <input type="hidden" name="distanceKm" value={distanceKm} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      bookmark
                    </span>
                    {t("destination.saveDestination")}
                  </button>
                </form>
              ) : null}
              <Link
                href={routesHref({
                  from: originName || undefined,
                  to: dest.name,
                  datePreset,
                  startDate: window.startDate,
                  endDate: window.endDate,
                  distance: first(raw.distance),
                  radiusKm: first(raw.radiusKm),
                  weatherGoal: first(raw.weatherGoal),
                  origin: originName || undefined,
                  lat: originLat ?? undefined,
                  lon: originLon ?? undefined,
                  mode,
                })}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-secondary bg-transparent px-4 py-3 text-sm font-medium text-secondary transition-colors hover:bg-secondary-container/10"
              >
                <span className="material-symbols-outlined text-[18px]">
                  route
                </span>
                {t("destination.planRoute")}
              </Link>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
