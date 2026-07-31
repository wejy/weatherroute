import { resolveLocaleFromAcceptLanguage } from "@weathertrip/i18n";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config";
import en, { type Dictionary } from "@/i18n/dictionaries/en";
import fi from "@/i18n/dictionaries/fi";

const dictionaries: Record<Locale, Dictionary> = { en, fi };

/** Pure dictionary lookup — safe for client and shared modules. */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function dateLocaleTag(locale: Locale): string {
  return locale === "fi" ? "fi-FI" : "en-GB";
}

/**
 * Request locale from cookie / Accept-Language.
 * Server Components / Route Handlers only (`next/headers`).
 */
export async function getLocale(): Promise<Locale> {
  const { cookies, headers } = await import("next/headers");
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get("accept-language");
  return resolveLocaleFromAcceptLanguage(accept, defaultLocale);
}
