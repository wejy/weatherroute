import Link from "next/link";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { getCurrentUser } from "@/server/auth/session";
import { getBillingEntitlement } from "@/server/dal/subscriptions";
import { isStripeBillingConfigured } from "@/server/billing/plans";
import {
  openBillingPortalAction,
  startCheckoutAction,
} from "@/server/actions/billing";

export const dynamic = "force-dynamic";

const FEATURE_KEYS = [
  "radius",
  "results",
  "departure",
  "sameCountry",
  "routes",
  "discovers",
] as const;
const HIGHLIGHT_KEYS = [
  "radius",
  "results",
  "departure",
  "sameCountry",
  "routes",
  "discovers",
  "future",
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return { title: t("pro.title") };
}

export default async function ProMarketingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const user = await getCurrentUser();
  const billing = await getBillingEntitlement(user?.id ?? null);
  const stripeReady = isStripeBillingConfigured();
  const raw = await searchParams;
  const checkout = typeof raw.checkout === "string" ? raw.checkout : "";

  const planLabel =
    billing.plan === "one_time"
      ? t("pro.oneTimePlan")
      : billing.plan === "monthly"
        ? t("pro.monthlyPlan")
        : t("pro.freePlan");

  const statusMessage =
    checkout === "success"
      ? t("pro.checkoutSuccess")
      : checkout === "cancel"
        ? t("pro.checkoutCancel")
        : checkout === "error"
          ? t("pro.checkoutError")
          : checkout === "unavailable"
            ? t("pro.checkoutUnavailable")
            : checkout === "trip_limit"
              ? t("pro.checkoutTripLimit")
              : null;

  return (
    <>
      <TopNav active="/settings" />
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-4xl px-margin-mobile pt-24 pb-28 md:px-margin-desktop"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
          {t("pro.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-on-surface-variant">
          {t("pro.subtitle")}
        </p>

        {statusMessage ? (
          <p
            className="mt-4 rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

        {user && billing.tier === "pro" ? (
          <p className="mt-4 text-sm font-semibold text-on-surface">
            {t("pro.currentPlan", { plan: planLabel })}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5">
            <span className="inline-flex rounded-lg bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
              {t("pro.freeBadge")}
            </span>
            <h2 className="mt-3 text-xl font-bold text-on-surface">
              {t("pro.freePlan")}
            </h2>
            <p className="mt-2 text-2xl font-bold text-on-surface">€0</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {t("pro.freeNoteBody")}
            </p>
          </div>

          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5">
            <span className="inline-flex rounded-lg bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
              {t("pro.oneTimeBadge")}
            </span>
            <h2 className="mt-3 text-xl font-bold text-on-surface">
              {t("pro.oneTimePlan")}
            </h2>
            <p className="mt-2 text-2xl font-bold text-on-surface">
              {t("pro.oneTimePrice")}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {t("pro.oneTimePriceNote")}
            </p>
            <CheckoutButton
              plan="one_time"
              label={t("pro.buyOneTime")}
              signedIn={Boolean(user)}
              stripeReady={stripeReady}
              signInLabel={t("pro.ctaSignIn")}
              unavailableLabel={t("pro.ctaSoon")}
            />
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-[0px_8px_24px_rgba(20,184,99,0.08)]">
            <span className="inline-flex rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
              {t("pro.monthlyBadge")}
            </span>
            <h2 className="mt-3 text-xl font-bold text-primary">
              {t("pro.monthlyPlan")}
            </h2>
            <p className="mt-2 text-2xl font-bold text-on-surface">
              {t("pro.monthlyPrice")}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {t("pro.monthlyPriceNote")}
            </p>
            <CheckoutButton
              plan="monthly"
              label={t("pro.buyMonthly")}
              signedIn={Boolean(user)}
              stripeReady={stripeReady}
              signInLabel={t("pro.ctaSignIn")}
              unavailableLabel={t("pro.ctaSoon")}
              primary
            />
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("pro.comparisonTitle")}
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-outline-variant/25 bg-surface-container-lowest">
            <div className="hidden min-w-[40rem] grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 border-b border-outline-variant/20 bg-surface-container-low px-5 py-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant md:grid">
              <span />
              <span>{t("pro.freeCol")}</span>
              <span>{t("pro.oneTimeCol")}</span>
              <span className="text-primary">{t("pro.monthlyCol")}</span>
            </div>
            <ul className="min-w-[40rem] divide-y divide-outline-variant/20">
              {FEATURE_KEYS.map((key) => (
                <li
                  key={key}
                  className="grid gap-3 px-5 py-5 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:items-start"
                >
                  <p className="font-semibold text-on-surface">
                    {t(`pro.rows.${key}.title`)}
                  </p>
                  <PlanCell
                    label={t("pro.freeCol")}
                    value={t(`pro.rows.${key}.free`)}
                  />
                  <PlanCell
                    label={t("pro.oneTimeCol")}
                    value={t(`pro.rows.${key}.oneTime`)}
                  />
                  <PlanCell
                    label={t("pro.monthlyCol")}
                    value={t(`pro.rows.${key}.monthly`)}
                    emphasize
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("pro.highlightsTitle")}
          </h2>
          <ul className="mt-4 space-y-3">
            {HIGHLIGHT_KEYS.map((key) => (
              <li
                key={key}
                className="flex gap-3 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4"
              >
                <span
                  className="material-symbols-outlined mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <p className="text-sm text-on-surface">
                  {t(`pro.highlights.${key}`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-primary/25 bg-surface-container-lowest p-6 shadow-[0px_10px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-xl font-bold text-on-surface">
            {t("pro.ctaTitle")}
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">{t("pro.ctaBody")}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {billing.hasMonthlySubscription ? (
              <form action={openBillingPortalAction}>
                <button
                  type="submit"
                  className="rounded-lg bg-secondary px-4 py-3 text-sm font-semibold text-on-secondary"
                >
                  {t("pro.manageBilling")}
                </button>
              </form>
            ) : null}
            <Link
              href="/settings"
              className="rounded-lg border border-outline-variant px-4 py-3 text-center text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
            >
              {t("pro.ctaSettings")}
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-on-primary"
            >
              {t("pro.ctaDiscover")}
            </Link>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}

function PlanCell({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p
        className={`mb-1 text-xs font-semibold uppercase tracking-wide md:hidden ${
          emphasize ? "text-primary" : "text-on-surface-variant"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-sm ${
          emphasize ? "font-medium text-on-surface" : "text-on-surface-variant"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CheckoutButton({
  plan,
  label,
  signedIn,
  stripeReady,
  signInLabel,
  unavailableLabel,
  primary,
}: {
  plan: "one_time" | "monthly";
  label: string;
  signedIn: boolean;
  stripeReady: boolean;
  signInLabel: string;
  unavailableLabel: string;
  primary?: boolean;
}) {
  const className = primary
    ? "mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary"
    : "mt-5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary";

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent("/pro")}`}
        className={`${className} inline-flex items-center justify-center`}
      >
        {signInLabel}
      </Link>
    );
  }
  if (!stripeReady) {
    return (
      <button type="button" disabled className={`${className} opacity-60`} title={unavailableLabel}>
        {unavailableLabel}
      </button>
    );
  }
  return (
    <form action={startCheckoutAction}>
      <input type="hidden" name="plan" value={plan} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
