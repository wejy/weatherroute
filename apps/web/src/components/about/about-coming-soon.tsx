import {
  ABOUT_COMING_SOON_ICONS,
  ABOUT_COMING_SOON_KEYS,
} from "@solviax/i18n";
import type { createTranslator } from "@/i18n/translate";

type AboutTranslator = ReturnType<typeof createTranslator>;

export function AboutComingSoon({ t }: { t: AboutTranslator }) {
  return (
    <section
      className="relative mt-14 overflow-hidden rounded-3xl border border-dashed border-primary/35 bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-secondary/5 p-6 md:p-8"
      aria-labelledby="about-coming-soon"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-accent/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex flex-wrap items-start gap-3">
        <span
          className="material-symbols-outlined fill-icon text-3xl text-primary"
          aria-hidden="true"
        >
          upcoming
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="about-coming-soon"
            className="text-lg font-semibold text-on-surface md:text-xl"
          >
            {t("about.comingSoon.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant md:text-base">
            {t("about.comingSoon.lead")}
          </p>
        </div>
      </div>

      <ul className="relative mt-6 grid gap-3 sm:grid-cols-2">
        {ABOUT_COMING_SOON_KEYS.map((key) => (
          <li
            key={key}
            className="flex gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/90 p-4 shadow-[0px_4px_16px_rgba(0,0,0,0.03)] backdrop-blur-sm"
          >
            <span
              className="material-symbols-outlined mt-0.5 shrink-0 text-2xl text-secondary"
              aria-hidden="true"
            >
              {ABOUT_COMING_SOON_ICONS[key]}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-on-surface md:text-base">
                  {t(`about.comingSoon.items.${key}.title`)}
                </h3>
                <span className="inline-flex rounded-md bg-accent/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface">
                  {t("about.comingSoon.badge")}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
                {t(`about.comingSoon.items.${key}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
