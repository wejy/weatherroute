import Link from "next/link";
import { TopNav, BottomNav } from "@/components/layout/top-nav";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";

export const dynamic = "force-dynamic";

const FEATURES = [
  { key: "discover", icon: "travel_explore" },
  { key: "map", icon: "map" },
  { key: "dryTrip", icon: "water_drop" },
  { key: "routes", icon: "alt_route" },
  { key: "save", icon: "bookmark" },
  { key: "share", icon: "share_location" },
  { key: "wikipedia", icon: "menu_book" },
  { key: "bilingual", icon: "translate" },
] as const;

const FREE_KEYS = ["discovers", "results", "mapRoutes"] as const;
const PRO_KEYS = ["radius", "results", "sameCountry", "saves"] as const;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  return { title: t("about.title") };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));

  return (
    <>
      <TopNav active="/about" />
      <main
        id="main-content"
        className="relative mx-auto min-h-screen max-w-4xl overflow-hidden px-margin-mobile pt-24 pb-28 md:px-margin-desktop"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl motion-safe:animate-float-slow"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-40 -left-16 h-56 w-56 rounded-full bg-secondary/10 blur-3xl motion-safe:animate-float-fast"
        />

        <header className="relative">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t("about.eyebrow")}
          </p>
          <div className="mt-3 flex items-start gap-4">
            <span
              className="material-symbols-outlined fill-icon shrink-0 text-5xl text-primary md:text-6xl"
              aria-hidden="true"
            >
              partly_cloudy_day
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-on-surface md:text-5xl md:leading-tight">
                {t("brand")}
              </h1>
              <p className="mt-2 text-xl font-semibold text-on-surface md:text-2xl">
                {t("about.headline")}
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-on-surface-variant md:text-lg">
            {t("about.lead")}
          </p>
        </header>

        <section className="relative mt-10 rounded-3xl border border-outline-variant/25 bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-primary/5 p-6 shadow-[0px_10px_30px_rgba(0,0,0,0.06)] md:p-8">
          <h2 className="text-lg font-semibold text-on-surface md:text-xl">
            {t("about.purposeTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant md:text-base">
            {t("about.purposeBody")}
          </p>
        </section>

        <section className="relative mt-6 overflow-hidden rounded-3xl border border-outline-variant/25 bg-surface-container-lowest p-6 shadow-[0px_8px_24px_rgba(0,0,0,0.04)] md:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2 h-44 w-44 -translate-y-1/2 rounded-full bg-accent/25 blur-2xl sm:right-4 sm:h-52 sm:w-52 md:h-56 md:w-56"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            className="pointer-events-none absolute top-1/2 right-2 h-36 w-36 -translate-y-1/2 text-accent opacity-[0.28] sm:right-4 sm:h-40 sm:w-40 md:h-44 md:w-44"
          >
            <circle cx="100" cy="100" r="42" fill="currentColor" />
            {Array.from({ length: 8 }, (_, i) => {
              const angle = ((i * 45 + 22.5) * Math.PI) / 180;
              const x1 = 100 + Math.cos(angle) * 56;
              const y1 = 100 + Math.sin(angle) * 56;
              const x2 = 100 + Math.cos(angle) * 88;
              const y2 = 100 + Math.sin(angle) * 88;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="relative">
            <h2 className="text-lg font-semibold text-on-surface md:text-xl">
              {t("about.whyTitle")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant md:text-base">
              {t("about.whyBody")}
            </p>
          </div>
        </section>

        <section className="relative mt-12">
          <h2 className="text-lg font-semibold text-on-surface md:text-xl">
            {t("about.featuresTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            {t("about.featuresLead")}
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature, index) => (
              <li
                key={feature.key}
                className="group rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5 transition-transform duration-300 motion-safe:hover:-translate-y-0.5"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <span
                  className="material-symbols-outlined text-3xl text-primary transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
                  aria-hidden="true"
                >
                  {feature.icon}
                </span>
                <h3 className="mt-3 text-base font-bold text-on-surface">
                  {t(`about.features.${feature.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {t(`about.features.${feature.key}.body`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative mt-14">
          <h2 className="text-lg font-semibold text-on-surface md:text-xl">
            {t("about.plansTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            {t("about.plansLead")}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5">
              <span className="inline-flex rounded-lg bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                {t("about.freeTitle")}
              </span>
              <ul className="mt-4 space-y-3">
                {FREE_KEYS.map((key) => (
                  <li key={key} className="flex gap-2 text-sm text-on-surface">
                    <span
                      className="material-symbols-outlined mt-0.5 shrink-0 text-base text-secondary"
                      aria-hidden="true"
                    >
                      check
                    </span>
                    {t(`about.freeItems.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-[0px_8px_24px_rgba(20,184,99,0.08)]">
              <span className="inline-flex rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                {t("about.proTitle")}
              </span>
              <ul className="mt-4 space-y-3">
                {PRO_KEYS.map((key) => (
                  <li key={key} className="flex gap-2 text-sm font-medium text-on-surface">
                    <span
                      className="material-symbols-outlined mt-0.5 shrink-0 text-base text-primary"
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    {t(`about.proItems.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-surface-variant">{t("about.plansHint")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/pro"
                className="inline-flex items-center justify-center rounded-lg bg-secondary px-4 py-3 text-sm font-semibold text-on-secondary"
              >
                {t("about.plansCta")}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary"
              >
                {t("about.ctaDiscover")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
