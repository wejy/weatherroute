import Link from "next/link";
import { TopNav } from "@/components/layout/top-nav";
import { loginDemoAction, logoutAction } from "@/server/actions/trips";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();

  return (
    <>
      <TopNav />
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-margin-mobile pt-16 pb-16">
        <div className="rounded-[2rem] border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-[0px_10px_30px_rgba(0,0,0,0.08)]">
          <div className="mb-8 text-center">
            <span className="material-symbols-outlined fill-icon mb-4 text-5xl text-primary">
              partly_cloudy_day
            </span>
            <h1 className="text-3xl font-bold text-on-surface">
              {user ? "You're signed in" : "Welcome to WeatherTrip"}
            </h1>
            <p className="mt-2 text-on-surface-variant">
              {user
                ? `Demo session as ${user.displayName}`
                : "Supabase Auth is ready to wire — use demo mode for now (no API keys required)."}
            </p>
          </div>

          {user ? (
            <div className="space-y-3">
              <Link
                href="/trips"
                className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-on-primary"
              >
                Go to Saved Trips
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-outline-variant py-3 font-semibold text-on-surface-variant"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <form action={loginDemoAction}>
              <button
                type="submit"
                className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container"
              >
                Continue with demo account
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Set <code className="text-primary">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            later to enable real auth.
          </p>
        </div>
      </main>
    </>
  );
}
