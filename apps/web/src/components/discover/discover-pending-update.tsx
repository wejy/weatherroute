"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";

/** Wait before showing so users can finish typing origin / adjusting filters. */
export const PENDING_UPDATE_DELAY_MS = 7_000;

/**
 * Sticky notice when Discover filters changed but results were not refreshed yet.
 * Appears after a short delay; the timer resets whenever `activityKey` changes
 * (e.g. while typing an origin).
 */
export function DiscoverPendingUpdate({
  visible,
  activityKey,
  pending,
  onUpdate,
  delayMs = PENDING_UPDATE_DELAY_MS,
  className,
}: {
  visible: boolean;
  /** Changing this while visible restarts the delay (typing, filter tweaks). */
  activityKey?: string;
  pending?: boolean;
  onUpdate: () => void;
  delayMs?: number;
  className?: string;
}) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }
    setShow(false);
    const id = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(id);
  }, [visible, activityKey, delayMs]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-8",
        className,
      )}
    >
      <div className="pointer-events-auto flex max-w-lg flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-surface/95 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <span
          className="material-symbols-outlined text-xl text-primary"
          aria-hidden="true"
        >
          sync
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium text-on-surface">
          {t("search.pendingUpdate")}
        </p>
        <button
          type="button"
          onClick={onUpdate}
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-wait disabled:opacity-80"
        >
          {pending ? t("search.searching") : t("search.updateResults")}
        </button>
      </div>
    </div>
  );
}
