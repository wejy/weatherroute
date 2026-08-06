import Link from "next/link";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { formatIsoDateForLocale } from "@/lib/dates";
import { getCurrentUser } from "@/server/auth/session";
import { getBillingEntitlement } from "@/server/dal/subscriptions";
import { isStripeBillingConfigured } from "@/server/billing/plans";
import {
  fallbackOneTimePayment,
  formatPaymentAmount,
  listCustomerPayments,
  type CustomerPayment,
} from "@/server/billing/invoices";
import {
  startCheckoutAction,
} from "@/server/actions/billing";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";
import { publicPageMeta } from "@/lib/seo-meta";

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
  const dict = getDictionary(locale);
  const t = createTranslator(dict);
  return publicPageMeta({
    title: t("pro.title"),
    description: dict.meta.pages.pro,
    path: "/pro",
  });
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
  const isPro = billing.tier === "pro";

  const planLabel =
    billing.plan === "one_time"
      ? t("pro.oneTimePlan")
      : billing.plan === "monthly"
        ? t("pro.monthlyPlan")
        : billing.plan === "yearly"
          ? t("pro.yearlyPlan")
          : t("pro.freePlan");

  const startedIso = billing.proSince ?? billing.oneTimePaidAt ?? null;
  const startedLabel = formatIsoDateForLocale(startedIso, locale);
  const validUntilLabel = formatIsoDateForLocale(
    billing.oneTimeExpiresAt,
    locale,
  );
  const renewsLabel = formatIsoDateForLocale(billing.currentPeriodEnd, locale);
  const cancelScheduled = Boolean(billing.cancelAtPeriodEnd);

  let payments: CustomerPayment[] = [];
  if (user && billing.stripeCustomerId && stripeReady) {
    const fromStripe = await listCustomerPayments(billing.stripeCustomerId);
    payments = fallbackOneTimePayment({
      oneTimePaidAt: billing.oneTimePaidAt,
      existing: fromStripe,
    });
  }

  const showStatus = Boolean(user && (isPro || billing.canManageBilling));

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
      <TopNav active="/pro" />
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-4xl overflow-x-hidden px-margin-mobile pt-24 pb-[max(7rem,calc(5.5rem+env(safe-area-inset-bottom)))] md:px-margin-desktop"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
          {t("pro.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-on-surface-variant">
          {t("pro.subtitle")}
        </p>

        {statusMessage ? (
          <p
            className="mt-4 rounded-lg bg-primary/10 px-4 py-2.5 text-sm text-primary"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

        {showStatus ? (
          <section
            className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5"
            aria-labelledby="pro-status-heading"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("pro.statusTitle")}
            </p>
            <h2
              id="pro-status-heading"
              className="mt-1 text-lg font-bold text-on-surface"
            >
              {isPro
                ? cancelScheduled
                  ? t("pro.statusCanceling")
                  : t("pro.statusActive")
                : t("pro.currentPlan", { plan: planLabel })}
            </h2>
            {isPro ? (
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {t("pro.currentPlan", { plan: planLabel })}
              </p>
            ) : null}
            <ul className="mt-3 space-y-1 text-sm text-on-surface-variant">
              {startedLabel ? (
                <li>{t("pro.startedOn", { date: startedLabel })}</li>
              ) : null}
              {billing.plan === "one_time" && validUntilLabel ? (
                <li>{t("pro.validUntil", { date: validUntilLabel })}</li>
              ) : null}
              {(billing.plan === "monthly" || billing.plan === "yearly") &&
              renewsLabel ? (
                <li>
                  {cancelScheduled
                    ? t("pro.cancelingEndsOn", { date: renewsLabel })
                    : t("pro.renewsOn", { date: renewsLabel })}
                </li>
              ) : null}
            </ul>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-on-surface">
                {t("pro.paymentHistoryTitle")}
              </h3>
              {payments.length > 0 ? (
                <div className="mt-2 overflow-x-auto rounded-xl border border-outline-variant/25 bg-surface-container-lowest">
                  <table className="w-full min-w-[16rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/20 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        <th className="px-3 py-2.5 font-semibold sm:px-4">
                          {t("pro.paymentDate")}
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold sm:px-4">
                          {t("pro.paymentAmount")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2.5 text-on-surface sm:px-4">
                            {formatIsoDateForLocale(p.paidAt, locale)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-on-surface sm:px-4">
                            {formatPaymentAmount(
                              p.amountCents,
                              p.currency,
                              locale,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-on-surface-variant">
                  {t("pro.paymentHistoryEmpty")}
                </p>
              )}
            </div>

            {billing.canManageBilling && stripeReady ? (
              <div className="mt-4">
                <BillingPortalButton
                  label={
                    cancelScheduled
                      ? t("pro.manageBillingCanceling")
                      : t("pro.manageBilling")
                  }
                  errorLabel={t("pro.checkoutError")}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-on-secondary disabled:opacity-60 sm:w-auto"
                />
                <p className="mt-2 text-xs text-on-surface-variant">
                  {cancelScheduled
                    ? t("pro.manageBillingHintCanceling")
                    : t("pro.manageBillingHint")}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4 sm:p-5">
            <span className="inline-flex rounded-lg bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
              {t("pro.freeBadge")}
            </span>
            <h2 className="mt-3 text-xl font-bold text-on-surface">
              {t("pro.freePlan")}
            </h2>
            <p className="mt-2 text-2xl font-bold text-on-surface">€0</p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              {t("pro.freeNoteBody")}
            </p>
          </div>

          <div
            className={`flex flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 sm:p-5 ${
              isPro ? "opacity-70" : ""
            }`}
          >
            <span className="inline-flex rounded-lg bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
              {t("pro.oneTimeBadge")}
            </span>
            <h2 className="mt-3 text-xl font-bold text-on-surface">
              {t("pro.oneTimePlan")}
            </h2>
            <p className="mt-2 text-2xl font-bold text-on-surface">
              {t("pro.oneTimePrice")}
            </p>
            <p className="mt-1 text-xs font-medium text-on-surface-variant">
              {t("pro.vatInclusive")}
            </p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-on-surface-variant">
              {t("pro.oneTimePriceNote")}
            </p>
            {isPro ? (
              <p className="mt-5 text-sm font-semibold text-on-surface-variant">
                {t("pro.alreadyPro")}
              </p>
            ) : (
              <CheckoutButton
                plan="one_time"
                label={t("pro.buyOneTime")}
                signedIn={Boolean(user)}
                stripeReady={stripeReady}
                signInLabel={t("pro.ctaSignIn")}
                unavailableLabel={t("pro.ctaSoon")}
              />
            )}
          </div>

          <div
            className={`flex flex-col rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-[0px_8px_24px_rgba(20,184,99,0.08)] sm:p-5 ${
              isPro &&
              (billing.plan === "monthly" || billing.plan === "yearly")
                ? "opacity-70"
                : ""
            }`}
          >
            <span className="inline-flex rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
              {t("pro.monthlyBadge")}
            </span>
            <h2 className="mt-3 text-xl font-bold text-primary">
              {t("pro.monthlyPlan")}
            </h2>
            <p className="mt-2 text-2xl font-bold text-on-surface">
              {t("pro.monthlyPrice")}
            </p>
            <p className="mt-1 text-xs font-medium text-on-surface-variant">
              {t("pro.vatInclusive")}
            </p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-on-surface-variant">
              {t("pro.monthlyPriceNote")}
            </p>
            {isPro &&
            (billing.plan === "monthly" || billing.plan === "yearly") ? (
              <p className="mt-5 text-sm font-semibold text-on-surface-variant">
                {t("pro.alreadyPro")}
              </p>
            ) : (
              <CheckoutButton
                plan="monthly"
                label={t("pro.buyMonthly")}
                signedIn={Boolean(user)}
                stripeReady={stripeReady}
                signInLabel={t("pro.ctaSignIn")}
                unavailableLabel={t("pro.ctaSoon")}
                primary
              />
            )}
          </div>

          <div
            className={`flex flex-col rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-[0px_8px_24px_rgba(20,184,99,0.08)] sm:p-5 ${
              isPro &&
              (billing.plan === "monthly" || billing.plan === "yearly")
                ? "opacity-70"
                : ""
            }`}
          >
            <span className="inline-flex rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
              {t("pro.yearlyBadge")}
            </span>
            <h2 className="mt-3 text-xl font-bold text-primary">
              {t("pro.yearlyPlan")}
            </h2>
            <p className="mt-2 text-2xl font-bold text-on-surface">
              {t("pro.yearlyPrice")}
            </p>
            <p className="mt-1 text-xs font-medium text-on-surface-variant">
              {t("pro.vatInclusive")}
            </p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-on-surface-variant">
              {t("pro.yearlyPriceNote")}
            </p>
            {isPro &&
            (billing.plan === "monthly" || billing.plan === "yearly") ? (
              <p className="mt-5 text-sm font-semibold text-on-surface-variant">
                {t("pro.alreadyPro")}
              </p>
            ) : (
              <CheckoutButton
                plan="yearly"
                label={t("pro.buyYearly")}
                signedIn={Boolean(user)}
                stripeReady={stripeReady}
                signInLabel={t("pro.ctaSignIn")}
                unavailableLabel={t("pro.ctaSoon")}
                primary
              />
            )}
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("pro.comparisonTitle")}
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-outline-variant/25 bg-surface-container-lowest [-webkit-overflow-scrolling:touch]">
            <div className="hidden min-w-[48rem] grid-cols-[minmax(10rem,1.3fr)_repeat(4,minmax(6.5rem,1fr))] gap-3 border-b border-outline-variant/20 bg-surface-container-low px-5 py-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant md:grid">
              <span />
              <span>{t("pro.freeCol")}</span>
              <span>{t("pro.oneTimeCol")}</span>
              <span className="text-primary">{t("pro.monthlyCol")}</span>
              <span className="text-primary">{t("pro.yearlyCol")}</span>
            </div>
            <ul className="divide-y divide-outline-variant/20 md:min-w-[48rem]">
              {FEATURE_KEYS.map((key) => (
                <li
                  key={key}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(10rem,1.3fr)_repeat(4,minmax(6.5rem,1fr))] md:items-start md:px-5 md:py-5"
                >
                  <p className="font-semibold text-on-surface">
                    {t(`pro.rows.${key}.title`)}
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:contents">
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
                    <PlanCell
                      label={t("pro.yearlyCol")}
                      value={t(`pro.rows.${key}.yearly`)}
                      emphasize
                    />
                  </div>
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
                <p className="text-sm leading-relaxed text-on-surface">
                  {t(`pro.highlights.${key}`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-primary/25 bg-surface-container-lowest p-4 shadow-[0px_10px_30px_rgba(0,0,0,0.06)] sm:p-6">
          <h2 className="text-xl font-bold text-on-surface">
            {t("pro.ctaTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            {t("pro.ctaBody")}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
            {billing.canManageBilling && stripeReady ? (
              <BillingPortalButton
                label={
                  cancelScheduled
                    ? t("pro.manageBillingCanceling")
                    : t("pro.manageBilling")
                }
                errorLabel={t("pro.checkoutError")}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary px-4 py-3 text-sm font-semibold text-on-secondary disabled:opacity-60 sm:w-auto"
              />
            ) : null}
            <Link
              href="/settings"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-outline-variant px-4 py-3 text-center text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary sm:w-auto"
            >
              {t("pro.ctaSettings")}
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-on-primary sm:w-auto"
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
    <div className="min-w-0 rounded-lg bg-surface-container/60 p-2.5 md:rounded-none md:bg-transparent md:p-0">
      <p
        className={`mb-1 text-[11px] font-semibold tracking-wide uppercase md:hidden ${
          emphasize ? "text-primary" : "text-on-surface-variant"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-sm leading-snug break-words ${
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
  plan: "one_time" | "monthly" | "yearly";
  label: string;
  signedIn: boolean;
  stripeReady: boolean;
  signInLabel: string;
  unavailableLabel: string;
  primary?: boolean;
}) {
  const className = primary
    ? "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary"
    : "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary";

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent("/pro")}`}
        className={`mt-5 ${className}`}
      >
        {signInLabel}
      </Link>
    );
  }
  if (!stripeReady) {
    return (
      <button
        type="button"
        disabled
        className={`mt-5 ${className} opacity-60`}
        title={unavailableLabel}
      >
        {unavailableLabel}
      </button>
    );
  }
  return (
    <form action={startCheckoutAction} className="mt-5">
      <input type="hidden" name="plan" value={plan} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
