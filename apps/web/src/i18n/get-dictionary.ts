import { cookies, headers } from "next/headers";
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

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get("accept-language");
  return resolveLocaleFromAcceptLanguage(accept, defaultLocale);
}

export function dateLocaleTag(locale: Locale): string {
  return locale === "fi" ? "fi-FI" : "en-GB";
}
