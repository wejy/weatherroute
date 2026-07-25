export const locales = ["en", "fi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "wt_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "fi";
}
