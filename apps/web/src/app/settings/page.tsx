import Link from "next/link";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { getCurrentUser } from "@/server/auth/session";
import {
  DISCOVER_DISPLAY_OPTIONS,
  getDiscoverTierForSettings,
} from "@/server/dal/discover-limits";
import {
  getEffectiveSameCountryOnly,
} from "@/server/dal/user-prefs";
import {
  saveDiscoverDisplayAction,
  saveSameCountryOnlyAction,
  settingsSignOutAction,
} from "@/server/actions/settings";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";
import { ActiveSubscriptionBadge } from "@/components/billing/active-subscription-badge";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import {
  DISCOVER_ANON_DISPLAY,
  DISCOVER_FREE_DISPLAY,
  DISCOVER_PRO_DISPLAY_MAX,
} from "@/lib/distance";
import { getBillingEntitlement } from "@/server/dal/subscriptions";
import { isStripeBillingConfigured } from "@/server/billing/plans";
import { getUserRole } from "@/server/dal/roles";
import { formatIsoDateForLocale } from "@/lib/dates";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CookiePreferencesPanel } from "@/components/consent/cookie-preferences-panel";
import { SiteFooter } from "@/components/layout/site-footer";
import { noIndexPageMeta } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return noIndexPageMeta(t("settings.title"));
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
  const sameCountryPrefs = await getEffectiveSameCountryOnly();
  const billing = await getBillingEntitlement(user?.id ?? null);
  const stripeReady = isStripeBillingConfigured();
  const isAdmin = user ? (await getUserRole(user.id)) === "admin" : false;
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

  const isPro = caps.tier === "pro";
  const planLabel =
    billing.plan === "one_time"
      ? t("settings.planOneTime")
      : billing.plan === "monthly"
        ? t("settings.planMonthly")
        : billing.plan === "yearly"
          ? t("settings.planYearly")
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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="m-0 text-xs text-on-surface-variant">{planLabel}</p>
                    {isPro ? (
                      <ActiveSubscriptionBadge label={t("settings.activeBadge")} />
                    ) : null}
                  </div>
                  {isAdmin ? (
                    <p className="mt-3">
                      <Link
                        href="/admin"
                        className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {t("settings.adminLink")}
                      </Link>
                    </p>
                  ) : null}
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
            {t("settings.sameCountryTitle")}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {t("settings.sameCountryHint")}
          </p>
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5">
            {user ? (
              <form action={saveSameCountryOnlyAction} className="space-y-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-on-surface">
                  <input
                    type="checkbox"
                    name="sameCountryOnly"
                    defaultChecked={sameCountryPrefs.preference}
                    className="mt-1 size-4 rounded border-outline-variant accent-primary"
                  />
                  <span>
                    {t("settings.sameCountryLabel")}
                    {!isPro ? (
                      <span className="mt-1 block text-xs font-normal text-on-surface-variant">
                        {t("settings.sameCountryProNote")}
                      </span>
                    ) : sameCountryPrefs.effective ? (
                      <span className="mt-1 block text-xs font-normal text-on-surface-variant">
                        {t("settings.sameCountryActive")}
                      </span>
                    ) : null}
                  </span>
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
                >
                  {t("settings.save")}
                </button>
              </form>
            ) : (
              <p className="text-sm text-on-surface-variant">
                {t("settings.sameCountrySignInNote")}
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
              {t("settings.themeHint")}
            </p>
            <ThemeToggle />
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("settings.consentTitle")}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {t("settings.consentHint")}
          </p>
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5">
            <CookiePreferencesPanel />
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
            {user && billing.tier === "pro" ? (
              <ul className="mb-4 space-y-1 text-sm text-on-surface">
                <li className="flex flex-wrap items-center gap-2 font-semibold">
                  <span>
                    {billing.plan === "one_time"
                      ? t("settings.planOneTime")
                      : billing.plan === "monthly"
                        ? t("settings.planMonthly")
                        : billing.plan === "yearly"
                          ? t("settings.planYearly")
                          : t("pro.statusActive")}
                  </span>
                  <ActiveSubscriptionBadge label={t("settings.activeBadge")} />
                </li>
                {formatIsoDateForLocale(
                  billing.proSince ?? billing.oneTimePaidAt,
                  locale,
                ) ? (
                  <li className="text-on-surface-variant">
                    {t("pro.startedOn", {
                      date: formatIsoDateForLocale(
                        billing.proSince ?? billing.oneTimePaidAt,
                        locale,
                      ),
                    })}
                  </li>
                ) : null}
                {billing.plan === "one_time" &&
                formatIsoDateForLocale(billing.oneTimeExpiresAt, locale) ? (
                  <li className="text-on-surface-variant">
                    {t("pro.validUntil", {
                      date: formatIsoDateForLocale(
                        billing.oneTimeExpiresAt,
                        locale,
                      ),
                    })}
                  </li>
                ) : null}
                {(billing.plan === "monthly" || billing.plan === "yearly") &&
                formatIsoDateForLocale(billing.currentPeriodEnd, locale) ? (
                  <li className="text-on-surface-variant">
                    {billing.cancelAtPeriodEnd
                      ? t("pro.cancelingEndsOn", {
                          date: formatIsoDateForLocale(
                            billing.currentPeriodEnd,
                            locale,
                          ),
                        })
                      : t("pro.renewsOn", {
                          date: formatIsoDateForLocale(
                            billing.currentPeriodEnd,
                            locale,
                          ),
                        })}
                  </li>
                ) : null}
              </ul>
            ) : null}
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
              {user && billing.canManageBilling && stripeReady ? (
                <BillingPortalButton
                  label={
                    billing.cancelAtPeriodEnd
                      ? t("settings.subscriptionManageCanceling")
                      : t("settings.subscriptionManage")
                  }
                  errorLabel={t("pro.checkoutError")}
                  className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface-variant disabled:opacity-60 sm:w-auto"
                />
              ) : null}
            </div>
            {user && billing.canManageBilling && stripeReady ? (
              <p className="mt-2 text-xs text-on-surface-variant">
                {billing.cancelAtPeriodEnd
                  ? t("settings.subscriptionStatusHintCanceling")
                  : t("settings.subscriptionStatusHint")}
              </p>
            ) : null}
            {!stripeReady ? (
              <p className="mt-2 text-xs text-on-surface-variant">
                {t("settings.subscriptionSoon")}
              </p>
            ) : null}
          </div>
        </section>

        <SiteFooter />
      </main>
      <BottomNav />
    </>
  );
}
