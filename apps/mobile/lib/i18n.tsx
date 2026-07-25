import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import {
  createTranslator,
  defaultLocale,
  getDictionary,
  localeFromTag,
  translateCondition,
  type Dictionary,
  type Locale,
  type Translator,
} from "@weathertrip/i18n";

const STORAGE_KEY = "wt_locale";

function deviceLocale(): Locale {
  const tags = Localization.getLocales().map(
    (l) => l.languageTag || l.languageCode || "",
  );
  for (const tag of tags) {
    const hit = localeFromTag(tag);
    if (hit) return hit;
  }
  return defaultLocale;
}

type I18nContextValue = {
  locale: Locale;
  dict: Dictionary;
  t: Translator;
  setLocale: (locale: Locale) => void;
  translateCondition: (
    condition: keyof Dictionary["conditions"],
  ) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "fi") {
        setLocaleState(stored);
        return;
      }
      setLocaleState(deviceLocale());
    })();
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => {
    const dict = getDictionary(locale);
    const t = createTranslator(dict);
    return {
      locale,
      dict,
      t,
      setLocale,
      translateCondition: (condition: keyof Dictionary["conditions"]) =>
        translateCondition(dict, condition),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
