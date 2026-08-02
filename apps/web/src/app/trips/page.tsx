import Link from "next/link";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { getCurrentUser } from "@/server/auth/session";
import { listTripsForUser } from "@/server/dal/trips";
import { deleteTripAction } from "@/server/actions/trips";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { formatDistanceKm } from "@/lib/distance";
import { env, hasDatabase } from "@/lib/env";
import {
  isTravelMode,
  travelModeIcon,
  type TravelMode,
} from "@/lib/types";
import { withQuery } from "@/lib/discover-query";
import { RouteShareActions } from "@/components/routes/route-share-actions";
import { resolveUserTier } from "@/server/dal/user-prefs";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function tripRouteHref(trip: {
  originName: string;
  destinationName: string;
  originLat?: number | null;
  originLon?: number | null;
  destinationLat: number;
  destinationLon: number;
  travelMode?: string | null;
  datePreset?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): string {
  return withQuery("/routes", {
    from: trip.originName,
    to: trip.destinationName,
    fromLat: trip.originLat ?? undefined,
    fromLon: trip.originLon ?? undefined,
    toLat: trip.destinationLat,
    toLon: trip.destinationLon,
    mode: trip.travelMode ?? "driving",
    datePreset: trip.datePreset ?? undefined,
    startDate: trip.startDate ?? undefined,
    endDate: trip.endDate ?? undefined,
  });
}

function formatTripDates(
  trip: {
    datePreset?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  },
  locale: string,
): string | null {
  if (trip.startDate && trip.endDate) {
    if (trip.startDate === trip.endDate) return trip.startDate;
    return `${trip.startDate} – ${trip.endDate}`;
  }
  if (trip.startDate) return trip.startDate;
  if (trip.datePreset === "today") return locale === "fi" ? "Tänään" : "Today";
  if (trip.datePreset === "tomorrow")
    return locale === "fi" ? "Huomenna" : "Tomorrow";
  if (trip.datePreset === "weekend")
    return locale === "fi" ? "Viikonloppu" : "Weekend";
  return null;
}

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return { title: t("trips.title") };
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const demoMode = !(hasDatabase() && !env.useMocks);
  const raw = await searchParams;
  const modeParam = first(raw.mode);
  const modeFilter: TravelMode | "all" =
    modeParam && isTravelMode(modeParam) ? modeParam : "all";

  if (!user) {
    return (
      <>
        <TopNav active="/trips" />
        <main
          id="main-content"
          className="mx-auto min-h-screen max-w-lg px-margin-mobile pt-24 pb-24"
        >
          <h1 className="text-3xl font-bold text-on-surface">{t("trips.title")}</h1>
          <p className="mt-3 text-on-surface-variant">{t("trips.empty")}</p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary"
          >
            {demoMode ? t("trips.continueDemo") : t("login.title")}
          </Link>
        </main>
        <BottomNav active="/trips" />
      </>
    );
  }

  const trips = await listTripsForUser(user.id, { mode: modeFilter });
  const tier = await resolveUserTier(user.id);
  const isPro = tier === "pro";
  const filters: { id: "all" | TravelMode; label: string; icon: string }[] = [
    { id: "all", label: t("trips.filterAll"), icon: "filter_list" },
    { id: "driving", label: t("travel.driving"), icon: travelModeIcon("driving") },
    { id: "cycling", label: t("travel.cycling"), icon: travelModeIcon("cycling") },
  ];

  return (
    <>
      <TopNav active="/trips" />
      <main id="main-content" className="mx-auto min-h-screen max-w-[1280px] px-margin-mobile pt-24 pb-24 md:px-margin-desktop">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-on-surface">
              {t("trips.title")}
            </h1>
            <p className="mt-2 text-lg text-on-surface-variant">
              {t("trips.subtitle", { name: user.displayName })}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            <span className="material-symbols-outlined">add</span>
            {t("trips.discoverMore")}
          </Link>
        </div>

        <div
          className="mb-8 flex flex-wrap gap-2"
          role="group"
          aria-label={t("trips.filterLabel")}
        >
          {filters.map((f) => {
            const active = modeFilter === f.id;
            const href =
              f.id === "all"
                ? "/trips"
                : withQuery("/trips", { mode: f.id });
            return (
              <Link
                key={f.id}
                href={href}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-on-primary"
                    : "border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container"
                }`}
                aria-current={active ? "true" : undefined}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  {f.icon}
                </span>
                {f.label}
              </Link>
            );
          })}
        </div>

        {trips.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-12 text-center shadow-sm">
            <span className="material-symbols-outlined mb-4 text-5xl text-primary">
              bookmark
            </span>
            <p className="mb-6 text-on-surface-variant">
              {modeFilter === "all"
                ? t("trips.empty")
                : t("trips.emptyFiltered")}
            </p>
            <Link
              href="/"
              className="inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary"
            >
              {t("trips.discoverMore")}
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {trips.map((trip) => {
              const mode = isTravelMode(trip.travelMode)
                ? trip.travelMode
                : "driving";
              const datesLabel = formatTripDates(trip, locale);
              return (
                <li
                  key={trip.id}
                  className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-on-surface">
                        {trip.title}
                      </h2>
                      <p className="mt-1 text-on-surface-variant">
                        {trip.originName} → {trip.destinationName}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      <span
                        className="material-symbols-outlined text-[16px]"
                        aria-hidden="true"
                      >
                        {travelModeIcon(mode)}
                      </span>
                      {mode === "cycling"
                        ? t("travel.cycling")
                        : t("travel.driving")}
                    </span>
                  </div>
                  <div className="mb-6 flex flex-wrap gap-4 text-sm text-on-surface-variant">
                    {trip.distanceKm != null && trip.distanceKm > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">
                          straighten
                        </span>
                        {formatDistanceKm(trip.distanceKm, locale)}
                      </span>
                    )}
                    {trip.durationLabel ? (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">
                          schedule
                        </span>
                        {trip.durationLabel}
                      </span>
                    ) : null}
                    {datesLabel ? (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">
                          calendar_month
                        </span>
                        {datesLabel}
                      </span>
                    ) : null}
                    <span>
                      {new Date(trip.createdAt).toLocaleDateString(
                        locale === "fi" ? "fi-FI" : "en-GB",
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={tripRouteHref(trip)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
                    >
                      {t("trips.openRoute")}
                    </Link>
                    <form action={deleteTripAction}>
                      <input type="hidden" name="tripId" value={trip.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                      >
                        {t("trips.remove")}
                      </button>
                    </form>
                  </div>
                  {isPro ? (
                    <div className="mt-3">
                      <RouteShareActions
                        compact
                        fromName={trip.originName}
                        toName={trip.destinationName}
                        origin={
                          trip.originLat != null &&
                          trip.originLon != null &&
                          Number.isFinite(trip.originLat) &&
                          Number.isFinite(trip.originLon)
                            ? {
                                lat: trip.originLat,
                                lon: trip.originLon,
                              }
                            : trip.originName
                        }
                        destination={{
                          lat: trip.destinationLat,
                          lon: trip.destinationLon,
                        }}
                        mode={mode}
                        datePreset={trip.datePreset}
                        startDate={trip.startDate}
                        endDate={trip.endDate}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <BottomNav active="/trips" />
    </>
  );
}
