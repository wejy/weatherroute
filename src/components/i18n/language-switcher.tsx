"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/i18n/actions";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-outline-variant/40 bg-surface-container-low p-1 text-sm font-semibold",
        className,
      )}
      role="group"
      aria-label={t("language.label")}
      aria-busy={pending || undefined}
    >
      {(["en", "fi"] as const).map((code) => (
        <button
          key={code}
          type="button"
          disabled={pending}
          aria-pressed={locale === code}
          onClick={() => switchTo(code)}
          className={cn(
            "min-h-9 min-w-11 rounded-full px-3 py-1.5 transition-colors disabled:cursor-wait",
            locale === code
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-primary",
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
