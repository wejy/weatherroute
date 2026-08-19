export { default as en, type Dictionary } from "./en";
export { default as fi } from "./fi";
export type { Locale, WeatherCondition } from "./types";
export { locales, defaultLocale } from "./types";
export {
  getDictionary,
  createTranslator,
  translateCondition,
  translateUv,
  type Translator,
} from "./translate";
export {
  localeFromTag,
  resolveLocaleFromAcceptLanguage,
} from "./locale";
export {
  ABOUT_COMING_SOON_ICONS,
  ABOUT_COMING_SOON_KEYS,
  type AboutComingSoonKey,
} from "./about-coming-soon";
