import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import {
  createTranslator,
  getDictionary,
  localeFromTag,
  type Dictionary,
  type Locale,
  type Translator,
} from "@solviax/i18n";

const STORAGE_KEY = "wt_lite_locale";

function deviceLocale(): Locale {
  const tags = Localization.getLocales().map(
    (l) => l.languageTag || l.languageCode || "",
  );
  for (const tag of tags) {
    const hit = localeFromTag(tag);
    if (hit) return hit;
  }
  return "en";
}

type I18nContextValue = {
  locale: Locale;
  dict: Dictionary;
  t: Translator;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => deviceLocale());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "en" || stored === "fi") {
          setLocaleState(stored);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      dict,
      t: createTranslator(dict),
      setLocale,
    };
  }, [locale, setLocale]);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FCF8FF",
        }}
      >
        <ActivityIndicator color="#3525CD" />
      </View>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
