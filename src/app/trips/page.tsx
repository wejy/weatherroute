import Link from "next/link";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { getCurrentUser } from "@/server/auth/session";
import { listTripsForUser } from "@/server/dal/trips";
import { deleteTripAction, loginDemoAction } from "@/server/actions/trips";
import { MOCK_USER } from "@/server/integrations/mocks/data";

export const metadata = { title: "Saved Trips" };

export default async function TripsPage() {
  const user = (await getCurrentUser()) ?? MOCK_USER;
  const trips = await listTripsForUser(user.id);

  return (
    <>
      <TopNav active="/trips" />
      <main className="mx-auto min-h-screen max-w-[1280px] px-margin-mobile pt-24 pb-24 md:px-margin-desktop">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-on-surface">
              Saved Trips
            </h1>
            <p className="mt-2 text-lg text-on-surface-variant">
              Your weather-optimized escapes · signed in as {user.displayName}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            <span className="material-symbols-outlined">add</span>
            Discover more
          </Link>
        </div>

        {trips.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-12 text-center shadow-sm">
            <span className="material-symbols-outlined mb-4 text-5xl text-primary">
              bookmark
            </span>
            <p className="mb-6 text-on-surface-variant">
              No saved trips yet. Discover a sunny destination and save it.
            </p>
            <form action={loginDemoAction}>
              <button
                type="submit"
                className="rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary"
              >
                Continue as demo user
              </button>
            </form>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {trips.map((trip) => (
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
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {trip.weatherGoal ?? "sun"}
                  </span>
                </div>
                <div className="mb-6 flex gap-4 text-sm text-on-surface-variant">
                  {trip.distanceKm != null && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">
                        straighten
                      </span>
                      {trip.distanceKm} km
                    </span>
                  )}
                  <span>
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/routes?from=${encodeURIComponent(trip.originName)}&to=${encodeURIComponent(trip.destinationName)}`}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
                  >
                    Open route
                  </Link>
                  <form action={deleteTripAction}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav active="/trips" />
    </>
  );
}
