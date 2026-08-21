"use client";

import { useI18n } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

/**
 * Ranking explanation for discover results (home).
 * Same copy as the map nearby help control (`map.rankingHint`).
 */
export function RankingHint({ className }: { className?: string }) {
  const { t } = useI18n();
  const hint = t("map.rankingHint");

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low/80 px-3 py-2.5 text-left",
        className,
      )}
      role="note"
    >
      <span
        className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] leading-none text-secondary"
        aria-hidden="true"
      >
        help
      </span>
      <p className="m-0 text-sm leading-snug text-on-surface-variant">{hint}</p>
    </div>
  );
}
