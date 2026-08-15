"use client";

import { useI18n } from "@/components/i18n/locale-provider";

/**
 * Map side-panel heading with a help-style hint (distinct from About’s `info` icon).
 * Hint expands in-flow so it isn’t clipped by the side nav overflow.
 */
export function MapNearbyHeading() {
  const { t } = useI18n();
  const hint = t("map.rankingHint");

  return (
    <div className="group mb-3 shrink-0">
      <div className="flex items-center gap-1.5">
        <h1 className="m-0 min-w-0 text-xl font-semibold text-on-surface">
          {t("map.nearbyIdeal")}
        </h1>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-secondary focus-visible:bg-surface-container focus-visible:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={hint}
          title={hint}
        >
          <span
            className="material-symbols-outlined text-[20px] leading-none"
            aria-hidden="true"
          >
            help
          </span>
        </button>
      </div>
      <p
        role="tooltip"
        className="m-0 grid grid-rows-[0fr] text-xs font-normal leading-snug text-on-surface-variant opacity-0 transition-[grid-template-rows,opacity,margin] duration-150 ease-out group-hover:mt-1.5 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:mt-1.5 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100"
      >
        <span className="overflow-hidden">{hint}</span>
      </p>
    </div>
  );
}
