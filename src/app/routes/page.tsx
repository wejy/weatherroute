import Link from "next/link";
import { getRouteWeather } from "@/server/services/location-service";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNav } from "@/components/layout/top-nav";
import { weatherIcon, weatherIconClass } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return { title: t("nav.routes") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const from = (Array.isArray(raw.from) ? raw.from[0] : raw.from) || "Helsinki";
  const to = (Array.isArray(raw.to) ? raw.to[0] : raw.to) || "Tampere";
  const route = await getRouteWeather(from, to);
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SideNav active="/routes" />

      <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between bg-surface/80 px-margin-mobile shadow-[0px_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl md:hidden">
        <h1 className="text-2xl font-bold text-primary">{t("brand")}</h1>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login">
            <span className="material-symbols-outlined text-on-surface-variant">
              account_circle
            </span>
          </Link>
        </div>
      </header>

      <main className="relative flex h-full w-full flex-1 flex-col pt-16 md:flex-row md:pt-0 lg:ml-80">
        <section className="z-10 flex h-full w-full flex-col overflow-y-auto bg-surface-bright shadow-[10px_0_30px_rgba(0,0,0,0.03)] md:w-2/5 lg:w-[450px]">
          <div className="flex flex-col gap-8 p-6 md:p-8">
            <div>
              <h2 className="mb-2 text-[32px] leading-10 font-semibold text-on-surface">
                {route.title}
              </h2>
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

        <section className="relative h-[512px] flex-1 overflow-hidden bg-surface-container-low md:h-full">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle at 40% 70%, #c5d8ef, transparent 50%), linear-gradient(160deg, #e8f1f8, #d4e4f5 60%, #cfe0d8)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-12">
            <svg
              className="h-full max-h-[80%] w-full max-w-md drop-shadow-lg"
              viewBox="0 0 200 400"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="route-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#4edea3" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#4edea3" />
                </linearGradient>
              </defs>
              <circle cx="150" cy="350" r="6" fill="#3525cd" />
              <path
                d="M150,350 Q130,250 100,200 T50,50"
                fill="none"
                stroke="url(#route-gradient)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="50" cy="50" r="6" fill="#005338" />
            </svg>
          </div>

          <div className="absolute top-6 right-6 rounded-xl border border-outline-variant/10 bg-surface/90 p-4 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <h4 className="mb-2 text-sm font-medium tracking-wider text-on-surface-variant uppercase">
              Route Conditions
            </h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-tertiary-fixed-dim" />
                <span className="text-base text-on-surface">Clear Route</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="text-base text-on-surface">Cloudy / Caution</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-error" />
                <span className="text-base text-on-surface">Rain / Warning</span>
              </div>
            </div>
          </div>

          <div className="absolute right-6 bottom-6 flex flex-col gap-2">
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-on-surface shadow-[0px_4px_20px_rgba(0,0,0,0.1)] hover:bg-surface-container"
            >
              <span className="material-symbols-outlined">my_location</span>
            </button>
          </div>
        </section>
      </main>

      <BottomNav active="/routes" />
    </div>
  );
}
