import Link from "next/link";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import {
  AdminActivityChart,
  AdminBucketChart,
} from "@/components/admin/admin-charts";
import { requireAdminPage } from "@/server/dal/roles";
import { getAdminStats } from "@/server/dal/admin-stats";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { recordUsageEvent } from "@/server/dal/usage";
import { USAGE_TYPES } from "@/server/dal/usage-types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function eur(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fi" ? "fi-FI" : "en-EU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return { title: t("admin.title") };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdminPage();

  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const raw = await searchParams;
  const from = param(raw.from);
  const to = param(raw.to);
  const stats = await getAdminStats({ from, to });

  recordUsageEvent({
    type: USAGE_TYPES.adminStatsView,
    userId: admin.id,
    meta: { from: stats.from, to: stats.to, via: "page" },
  });

  const { users, usage, finance, costConfig, engagement } = stats;

  const returningRate =
    engagement.uniqueActive > 0
      ? Math.round(
          (engagement.returningPrior / engagement.uniqueActive) * 100,
        )
      : 0;
  const multiDayRate =
    engagement.uniqueActive > 0
      ? Math.round(
          (engagement.returningMultiDay / engagement.uniqueActive) * 100,
        )
      : 0;

  const userBuckets = [
    { key: "free", label: t("admin.usersFree"), value: users.free },
    {
      key: "monthly",
      label: t("admin.usersProMonthly"),
      value: users.proMonthly,
    },
    {
      key: "yearly",
      label: t("admin.usersProYearly"),
      value: users.proYearly,
    },
    {
      key: "one_time",
      label: t("admin.usersProOneTime"),
      value: users.proOneTime,
    },
    { key: "admin", label: t("admin.usersAdmin"), value: users.admin },
    {
      key: "inactive",
      label: t("admin.usersInactive"),
      value: users.inactive,
    },
  ];

  const externalBuckets = [
    {
      key: "geocode",
      label: t("admin.extMapboxGeocode"),
      value: usage.extMapboxGeocode,
    },
    {
      key: "directions",
      label: t("admin.extMapboxDirections"),
      value: usage.extMapboxDirections,
    },
    {
      key: "openmeteo",
      label: t("admin.extOpenMeteo"),
      value: usage.extOpenMeteo,
    },
    {
      key: "wiki",
      label: t("admin.extWikipedia"),
      value: usage.extWikipedia,
    },
  ];

  return (
    <>
      <TopNav active="/admin" />
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-3xl px-margin-mobile pt-24 pb-28 md:px-margin-desktop"
      >
        <h1 className="text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
          {t("admin.title")}
        </h1>
        <p className="mt-2 text-on-surface-variant">{t("admin.subtitle")}</p>

        <form
          method="get"
          className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4"
        >
          <label className="text-sm font-medium text-on-surface">
            {t("admin.from")}
            <input
              type="date"
              name="from"
              defaultValue={stats.from}
              className="mt-1 block rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface"
            />
          </label>
          <label className="text-sm font-medium text-on-surface">
            {t("admin.to")}
            <input
              type="date"
              name="to"
              defaultValue={stats.to}
              className="mt-1 block rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
          >
            {t("admin.applyRange")}
          </button>
          <p className="w-full text-xs text-on-surface-variant">
            {t("admin.rangeHint", { days: stats.rangeDays })}
          </p>
        </form>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("admin.chartsTitle")}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {t("admin.chartsHint")}
          </p>
          <AdminActivityChart
            title={t("admin.activityChart")}
            series={stats.series}
            labels={{
              discover: t("admin.usageDiscover"),
              login: t("admin.usageLogin"),
              route: t("admin.usageRoute"),
              routeSave: t("admin.usageRouteSave"),
            }}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminBucketChart
              title={t("admin.usersChart")}
              buckets={userBuckets}
            />
            <AdminBucketChart
              title={t("admin.externalChart")}
              buckets={externalBuckets}
            />
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("admin.engagementTitle")}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {t("admin.engagementHint")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label={t("admin.registeredTotal")}
              value={engagement.registeredTotal}
            />
            <StatCard
              label={t("admin.uniqueActive")}
              value={engagement.uniqueActive}
            />
            <StatCard
              label={t("admin.newActive")}
              value={engagement.newActive}
            />
            <StatCard
              label={t("admin.returningPrior")}
              value={engagement.returningPrior}
            />
            <StatCard
              label={t("admin.returningPriorRate")}
              value={`${returningRate}%`}
            />
            <StatCard
              label={t("admin.returningMultiDay")}
              value={engagement.returningMultiDay}
            />
            <StatCard
              label={t("admin.returningMultiDayRate")}
              value={`${multiDayRate}%`}
            />
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("admin.usersTitle")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label={t("admin.usersTotal")} value={users.total} />
            <StatCard label={t("admin.usersFree")} value={users.free} />
            <StatCard
              label={t("admin.usersProMonthly")}
              value={users.proMonthly}
            />
            <StatCard
              label={t("admin.usersProYearly")}
              value={users.proYearly}
            />
            <StatCard
              label={t("admin.usersProOneTime")}
              value={users.proOneTime}
            />
            <StatCard label={t("admin.usersAdmin")} value={users.admin} />
            <StatCard
              label={t("admin.usersInactive")}
              value={users.inactive}
            />
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("admin.usageTitle")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label={t("admin.usageDiscover")} value={usage.discover} />
            <StatCard label={t("admin.usageLogin")} value={usage.login} />
            <StatCard label={t("admin.usageRoute")} value={usage.route} />
            <StatCard
              label={t("admin.usageRouteSave")}
              value={usage.routeSave}
            />
            <StatCard
              label={t("admin.usageShare")}
              value={usage.shareRedeem}
            />
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("admin.externalTitle")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label={t("admin.extMapboxGeocode")}
              value={usage.extMapboxGeocode}
            />
            <StatCard
              label={t("admin.extMapboxDirections")}
              value={usage.extMapboxDirections}
            />
            <StatCard
              label={t("admin.extOpenMeteo")}
              value={usage.extOpenMeteo}
            />
            <StatCard
              label={t("admin.extWikipedia")}
              value={usage.extWikipedia}
            />
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            {t("admin.financeTitle")}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {t("admin.financeDisclaimer")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label={t("admin.revenueGross")}
              value={eur(finance.revenueGrossEur, locale)}
            />
            <StatCard
              label={t("admin.stripeFees")}
              value={eur(finance.stripeFeesEur, locale)}
            />
            <StatCard
              label={t("admin.revenueNet")}
              value={eur(finance.revenueNetEur, locale)}
            />
            <StatCard
              label={t("admin.costsTotal")}
              value={eur(finance.costsTotalEur, locale)}
            />
            <StatCard
              label={t("admin.netMargin")}
              value={eur(finance.netMarginEur, locale)}
            />
          </div>
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
            <p className="font-medium text-on-surface">
              {t("admin.costBreakdown")}
            </p>
            <ul className="mt-3 space-y-1">
              <li>
                {t("admin.fixedOps")}: {eur(finance.fixedProratedEur, locale)}{" "}
                ({t("admin.fixedMonthly")}:{" "}
                {eur(finance.fixedMonthlyEur, locale)})
              </li>
              <li>
                {t("admin.openMeteoCost")}:{" "}
                {eur(finance.openMeteoProratedEur, locale)}
              </li>
              <li>
                {t("admin.variableApi")}: {eur(finance.variableApiEur, locale)}
              </li>
              <li>
                {t("admin.payingMonthly")}: {finance.paying.monthlyActive} ×{" "}
                {eur(finance.prices.monthlyEur, locale)}
              </li>
              <li>
                {t("admin.payingYearly")}: {finance.paying.yearlyActive} ×{" "}
                {eur(finance.prices.yearlyEur, locale)} ({t("admin.amortizedYearly")}
                )
              </li>
              <li>
                {t("admin.payingOneTime")}: {finance.paying.oneTimeActive} ×{" "}
                {eur(finance.prices.oneTimeEur, locale)} ({t("admin.amortized")}
                )
              </li>
            </ul>
            <p className="mt-4 text-xs">
              {t("admin.envHint", {
                server: costConfig.serverMonthlyEur,
                db: costConfig.databaseMonthlyEur,
                upstash: costConfig.upstashMonthlyEur,
                other: costConfig.otherMonthlyEur,
              })}
            </p>
          </div>
        </section>

        <p className="mt-10 text-sm text-on-surface-variant">
          <Link
            href="/settings"
            className="text-primary underline-offset-2 hover:underline"
          >
            {t("admin.backToSettings")}
          </Link>
        </p>
      </main>
      <BottomNav active="/admin" />
    </>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-on-surface">
        {value}
      </p>
    </div>
  );
}
