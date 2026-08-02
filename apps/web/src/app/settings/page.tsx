import Link from "next/link";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { getCurrentUser } from "@/server/auth/session";
import {
  DISCOVER_DISPLAY_OPTIONS,
  getDiscoverTierForSettings,
} from "@/server/dal/discover-limits";
import {
  EARLIEST_DEPARTURE_HOURS,
  formatHourOption,
  getEffectiveEarliestDepartureHour,
} from "@/server/dal/user-prefs";
import {
  saveDiscoverDisplayAction,
  saveEarliestDepartureAction,
  settingsSignOutAction,
} from "@/server/actions/settings";
import { openBillingPortalAction } from "@/server/actions/billing";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import {
  DISCOVER_ANON_DISPLAY,
  DISCOVER_FREE_DISPLAY,
  DISCOVER_PRO_DISPLAY_MAX,
} from "@/lib/distance";
import { getBillingEntitlement } from "@/server/dal/subscriptions";
import { isStripeBillingConfigured } from "@/server/billing/plans";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return { title: t("settings.title") };
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const caps = await getDiscoverTierForSettings();
  const departurePrefs = await getEffectiveEarliestDepartureHour();
  const billing = await getBillingEntitlement(user?.id ?? null);
  const stripeReady = isStripeBillingConfigured();
  const raw = await searchParams;
  const saved = raw.saved === "1";
  const billingFlash =
    raw.billing === "unavailable" || raw.billing === "error"
      ? String(raw.billing)
      : "";

  const preferred = Math.min(
    caps.maxSelectable,
    caps.preference ??
      (caps.tier === "pro"
        ? caps.currentDisplay
        : caps.tier === "free"
          ? DISCOVER_FREE_DISPLAY
          : DISCOVER_ANON_DISPLAY),
  );

  const earliestDefault =
    departurePrefs.preference != null
      ? String(departurePrefs.preference)
      : "any";
  const isPro = caps.tier === "pro";
  const planLabel =
    billing.plan === "one_time"
      ? t("settings.planOneTime")
      : billing.plan === "monthly"
        ? t("settings.planMonthly")
        : isPro
          ? t("settings.tierPro")
          : t("settings.tierFree");

  return (
    <>
      <TopNav active="/settings" />
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-2xl px-margin-mobile pt-24 pb-28 md:px-margin-desktop"
      >
        <h1 className="text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
          {t("settings.title")}
        </h1>
        <p className="mt-2 text-on-surface-variant">{t("settings.subtitle")}</p>

        {saved ? (
          <p
            className="mt-4 rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary"
            role="status"
          >
            {t("settings.saved")}
          </p>
        ) : null}

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("settings.account")}
          </h2>
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5">
            {user ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-on-surface">{user.displayName}</p>
                  <p className="text-sm text-on-surface-variant">{user.email}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {planLabel}
                  </p>
                </div>
                <form action={settingsSignOutAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
                  >
                    {t("login.signOut")}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-on-surface-variant">{t("settings.notSignedIn")}</p>
                <Link
                  href="/login?next=/settings"
                  className="inline-flex justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
                >
                  {t("login.title")}
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("settings.discoverTitle")}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {t("settings.discoverHint")}
          </p>
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5">
            {user ? (
              <form action={saveDiscoverDisplayAction} className="space-y-4">
                <label className="block text-sm font-medium text-on-surface">
                  {t("settings.discoverLabel")}
                  <select
                    name="display"
                    defaultValue={String(preferred)}
                    className="mt-2 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-on-surface"
                  >
                    {DISCOVER_DISPLAY_OPTIONS.map((n) => {
                      const locked = !isPro && n > DISCOVER_FREE_DISPLAY;
                      return (
                        <option key={n} value={n} disabled={locked}>
                          {locked
                            ? t("settings.discoverOptionPro", { count: n })
                            : t("settings.discoverOption", { count: n })}
                        </option>
                      );
                    })}
                  </select>
                </label>
                {!isPro ? (
                  <p className="text-xs text-on-surface-variant">
                    {t("settings.discoverFreeNote", {
                      free: DISCOVER_FREE_DISPLAY,
                      max: DISCOVER_PRO_DISPLAY_MAX,
                    })}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
                >
                  {t("settings.save")}
                </button>
              </form>
            ) : (
              <p className="text-sm text-on-surface-variant">
                {t("settings.discoverAnonNote", { count: DISCOVER_ANON_DISPLAY })}
              </p>
            )}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("settings.departureTitle")}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {t("settings.departureHint")}
          </p>
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5">
            {user ? (
              <form action={saveEarliestDepartureAction} className="space-y-4">
                <label className="block text-sm font-medium text-on-surface">
                  {t("settings.departureLabel")}
                  <select
                    name="earliestDeparture"
                    defaultValue={earliestDefault}
                    className="mt-2 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-on-surface"
                  >
                    <option value="any">{t("settings.departureAny")}</option>
                    {EARLIEST_DEPARTURE_HOURS.map((h) => (
                      <option key={h} value={h}>
                        {isPro
                          ? formatHourOption(h)
                          : t("settings.departureOptionPro", {
                              time: formatHourOption(h),
                            })}
                      </option>
                    ))}
                  </select>
                </label>
                {!isPro ? (
                  <p className="text-xs text-on-surface-variant">
                    {t("settings.departureProNote")}
                  </p>
                ) : departurePrefs.effectiveHour != null ? (
                  <p className="text-xs text-on-surface-variant">
                    {t("settings.departureActive", {
                      time: formatHourOption(departurePrefs.effectiveHour),
                    })}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
                >
                  {t("settings.save")}
                </button>
              </form>
            ) : (
              <p className="text-sm text-on-surface-variant">
                {t("settings.departureSignInNote")}
              </p>
            )}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("settings.appearanceTitle")}
          </h2>
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5">
            <p className="mb-3 text-sm text-on-surface-variant">
              {t("settings.themeComingSoon")}
            </p>
            <div
              role="radiogroup"
              aria-label={t("settings.themeLabel")}
              className="flex gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked="true"
                disabled
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary/5 px-3 py-3 text-sm font-semibold text-primary opacity-90"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  light_mode
                </span>
                {t("settings.themeLight")}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked="false"
                disabled
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant/40 px-3 py-3 text-sm font-semibold text-on-surface-variant opacity-50"
                title={t("settings.themeComingSoon")}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  dark_mode
                </span>
                {t("settings.themeDark")}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("settings.subscriptionTitle")}
          </h2>
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5">
            <p className="mb-4 text-sm text-on-surface-variant">
              {t("settings.subscriptionBody")}
            </p>
            {billingFlash ? (
              <p className="mb-3 text-sm text-on-surface-variant" role="status">
                {billingFlash === "unavailable"
                  ? t("settings.subscriptionSoon")
                  : t("pro.checkoutError")}
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/pro"
                className="inline-flex items-center justify-center rounded-lg bg-secondary px-4 py-3 text-sm font-semibold text-on-secondary"
              >
                {t("settings.subscriptionCta")}
              </Link>
              {user && billing.hasMonthlySubscription && stripeReady ? (
                <form action={openBillingPortalAction}>
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface-variant sm:w-auto"
                  >
                    {t("settings.subscriptionManage")}
                  </button>
                </form>
              ) : null}
            </div>
            {!stripeReady ? (
              <p className="mt-2 text-xs text-on-surface-variant">
                {t("settings.subscriptionSoon")}
              </p>
            ) : null}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
