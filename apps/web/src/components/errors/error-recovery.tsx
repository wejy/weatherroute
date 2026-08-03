"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/locale-provider";

/**
 * Friendly recovery UI for route errors. Never renders raw SQL / stack traces.
 */
export function ErrorRecovery({
  reset,
  kind = "generic",
}: {
  reset: () => void;
  kind?: "generic" | "unavailable";
}) {
  const { t } = useI18n();
  const title =
    kind === "unavailable"
      ? t("errors.unavailableTitle")
      : t("errors.genericTitle");
  const body =
    kind === "unavailable"
      ? t("errors.unavailableBody")
      : t("errors.genericBody");

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span
        className="material-symbols-outlined mb-4 text-5xl text-primary"
        aria-hidden="true"
      >
        {kind === "unavailable" ? "cloud_off" : "error_outline"}
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-on-surface">
        {title}
      </h1>
      <p className="mt-3 text-on-surface-variant">{body}</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
        >
          {t("errors.retry")}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-outline-variant px-5 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
        >
          {t("errors.home")}
        </Link>
      </div>
    </main>
  );
}
