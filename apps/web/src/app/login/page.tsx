import Link from "next/link";
import { TopNav } from "@/components/layout/top-nav";
import { LoginOtpForm } from "@/components/auth/login-otp-form";
import {
  loginDemoAction,
  logoutAction,
} from "@/server/actions/trips";
import { getCurrentUser } from "@/server/auth/session";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { env, hasDatabase } from "@/lib/env";
import { noIndexPageMeta } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return noIndexPageMeta(t("login.title"));
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const mode = hasDatabase() && !env.useMocks ? "otp" : "demo";
  const raw = await searchParams;
  const emailParam = typeof raw.email === "string" ? raw.email : "";
  const sent = raw.sent === "1";
  const error = typeof raw.error === "string" ? raw.error : "";
  const nextParam =
    typeof raw.next === "string" && raw.next.startsWith("/") && !raw.next.startsWith("//")
      ? raw.next
      : "/settings";

  return (
    <>
      <TopNav />
      <main
        id="main-content"
        className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-margin-mobile pt-16 pb-16"
      >
        <div className="rounded-[2rem] border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-[0px_10px_30px_rgba(0,0,0,0.08)]">
          <div className="mb-8 text-center">
            <span className="material-symbols-outlined fill-icon mb-4 text-5xl text-primary">
              partly_cloudy_day
            </span>
            <h1 className="text-3xl font-bold text-on-surface">
              {user ? t("login.signedIn") : t("login.welcome")}
            </h1>
            <p className="mt-2 text-on-surface-variant">
              {user
                ? t("login.demoSession", { name: user.displayName })
                : mode === "otp"
                  ? t("login.otpHint")
                  : t("login.demoHint")}
            </p>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-sm text-on-surface">
              {error === "code"
                ? t("login.errorCode")
                : error === "send"
                  ? t("login.errorSend")
                  : t("login.errorEmail")}
            </p>
          ) : null}

          {user ? (
            <div className="space-y-3">
              <Link
                href="/settings"
                className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-on-primary"
              >
                {t("login.goSettings")}
              </Link>
              <Link
                href="/trips"
                className="block w-full rounded-lg border border-outline-variant py-3 text-center font-semibold text-on-surface-variant"
              >
                {t("login.goTrips")}
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-outline-variant py-3 font-semibold text-on-surface-variant"
                >
                  {t("login.signOut")}
                </button>
              </form>
            </div>
          ) : mode === "otp" ? (
            <LoginOtpForm
              initialEmail={emailParam}
              initialSent={sent}
              nextParam={nextParam}
            />
          ) : (
            <form action={loginDemoAction}>
              <button
                type="submit"
                className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container"
              >
                {t("login.continueDemo")}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            {mode === "otp" ? t("login.otpFooter") : t("login.supabaseHint")}
          </p>
        </div>
      </main>
    </>
  );
}
