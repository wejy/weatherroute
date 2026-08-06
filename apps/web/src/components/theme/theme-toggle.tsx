"use client";

import { useI18n } from "@/components/i18n/locale-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: Array<{
  id: ThemePreference;
  icon: string;
  labelKey: "settings.themeSystem" | "settings.themeLight" | "settings.themeDark";
}> = [
  { id: "system", icon: "contrast", labelKey: "settings.themeSystem" },
  { id: "light", icon: "light_mode", labelKey: "settings.themeLight" },
  { id: "dark", icon: "dark_mode", labelKey: "settings.themeDark" },
];

export function ThemeToggle() {
  const { t } = useI18n();
  const { preference, setPreference } = useTheme();

  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:gap-2"
      role="radiogroup"
      aria-label={t("settings.themeLabel")}
    >
      {OPTIONS.map((opt) => {
        const selected = preference === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(opt.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-variant/40 text-on-surface-variant hover:border-primary/40 hover:text-primary",
            )}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              aria-hidden="true"
            >
              {opt.icon}
            </span>
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
