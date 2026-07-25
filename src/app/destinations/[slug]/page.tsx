import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildSuitability,
  getDestinationBySlug,
  getWeatherForPlace,
  summarizePeriod,
} from "@/server/services/weather-service";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { saveTripAction } from "@/server/actions/trips";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { resolveDateWindow } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
  const startDate = Array.isArray(raw.startDate)
    ? raw.startDate[0]
    : raw.startDate;
  const endDate = Array.isArray(raw.endDate) ? raw.endDate[0] : raw.endDate;

  const dest = await getDestinationBySlug(slug);
  if (!dest) notFound();

  const weather = await getWeatherForPlace({
    lat: dest.lat,
    lon: dest.lon,
    name: dest.placeName,
  });
  const badges = buildSuitability(weather);

  const window = resolveDateWindow({
    preset: startDate ? "custom" : "today",
    startDate,
    endDate: endDate || startDate,
  });
  const period = summarizePeriod(weather, window);
  const chartDays = weather.daily.slice(0, 10);

  return (
    <>
      <TopNav active="/" />
      <main className="mx-auto max-w-[1280px] space-y-8 px-margin-mobile pt-24 pb-24 md:px-margin-desktop">
        <section className="relative flex h-[400px] w-full flex-col justify-end overflow-hidden rounded-xl bg-surface-container-low p-8 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] md:h-[500px]">
          <Image
            src={dest.imageUrl}
            alt={dest.placeName}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-inverse-surface/80 via-inverse-surface/30 to-transparent" />
          <div className="relative z-20 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="text-on-tertiary">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                {dest.name},{" "}
                {dest.country === "Suomi" ? "Finland" : dest.country}
              </h1>
              <p className="mt-2 text-lg text-on-tertiary/80">
                Now: {weather.current.conditionLabel} • Feels like{" "}
                {formatTemp(weather.current.feelsLikeC)}C
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className="material-symbols-outlined text-[64px] text-secondary-fixed-dim"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {weatherIcon(weather.current.condition)}
              </span>
              <span className="text-4xl font-bold text-on-tertiary md:text-5xl">
                {formatTemp(weather.current.temperatureC)}C
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <p className="text-sm font-medium tracking-wide text-on-surface-variant uppercase">
              Current conditions
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
                  {weather.current.conditionLabel} · rain{" "}
                  {weather.current.precipitationProbability}%
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <p className="text-sm font-medium tracking-wide text-primary uppercase">
              Forecast · {period.rangeLabel}
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
                  {period.conditionLabel} · rain {period.rainProbability}% · sun
                  score {period.sunshineScore}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-on-surface">
                  Forecast · Precipitation & Cloud Cover
                </h2>
                <div className="flex gap-4">
                  <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                    <span className="h-3 w-3 rounded-sm bg-secondary-container" />
                    Precip
                  </span>
                  <span className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                    <span className="h-3 w-3 rounded-sm bg-surface-variant" />
                    Clouds
                  </span>
                </div>
              </div>
              <div className="relative flex h-[300px] w-full items-end justify-between overflow-hidden rounded-lg bg-surface-container p-4">
                {chartDays.map((day) => {
                  const inPeriod =
                    day.date >= period.startDate && day.date <= period.endDate;
                  return (
                    <div
                      key={day.date}
                      className={`relative flex h-full flex-1 flex-col items-center justify-end gap-1 px-1 ${
                        inPeriod ? "opacity-100" : "opacity-40"
                      }`}
                    >
                      <div
                        className="w-full rounded-t-sm bg-surface-variant opacity-50"
                        style={{ height: `${Math.max(8, day.cloudCover)}%` }}
                      />
                      <div
                        className="absolute bottom-0 w-[70%] rounded-t-sm bg-secondary-container opacity-80"
                        style={{
                          height: `${Math.max(4, day.precipitationProbability)}%`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-between px-1 text-[13px] font-semibold tracking-wider text-on-surface-variant">
                {chartDays.map((day) => (
                  <span key={day.date}>{day.dayLabel}</span>
                ))}
              </div>
              <p className="mt-3 text-xs text-on-surface-variant">
                Source: {weather.provider} · highlighted days match your trip
                window
              </p>
            </section>

            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                {
                  icon: "air",
                  label: "Wind",
                  value: `${Math.round(weather.current.windSpeedKmh)} km/h`,
                },
                {
                  icon: "humidity_percentage",
                  label: "Humidity",
                  value: `${weather.current.humidity}%`,
                },
                {
                  icon: "visibility",
                  label: "Visibility",
                  value: `${weather.current.visibilityKm} km`,
                },
                {
                  icon: "device_thermostat",
                  label: "UV Index",
                  value: weather.current.uvLabel,
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
                Trip Suitability
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
              <form action={saveTripAction}>
                <input
                  type="hidden"
                  name="title"
                  value={`Trip to ${dest.name}`}
                />
                <input type="hidden" name="originName" value="Helsinki" />
                <input
                  type="hidden"
                  name="destinationName"
                  value={dest.placeName}
                />
                <input type="hidden" name="destinationLat" value={dest.lat} />
                <input type="hidden" name="destinationLon" value={dest.lon} />
                <input type="hidden" name="weatherGoal" value="sun" />
                <input
                  type="hidden"
                  name="distanceKm"
                  value={dest.distanceKm}
                />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    bookmark
                  </span>
                  Save Destination
                </button>
              </form>
              <Link
                href={`/routes?from=Helsinki&to=${encodeURIComponent(dest.name)}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-secondary bg-transparent px-4 py-3 text-sm font-medium text-secondary transition-colors hover:bg-secondary-container/10"
              >
                <span className="material-symbols-outlined text-[18px]">
                  route
                </span>
                Plan Route
              </Link>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
