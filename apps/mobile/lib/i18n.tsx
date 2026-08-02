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
  translateCondition,
  translateUv,
  type Dictionary,
  type Locale,
  type Translator,
} from "@solviax/i18n";
import { colors } from "@/constants/Colors";

const STORAGE_KEY = "wt_locale";

function deviceLocale(): Locale {
  const tags = Localization.getLocales().map(
    (l) => l.languageTag || l.languageCode || "",
  );
  for (const tag of tags) {
    const hit = localeFromTag(tag);
    if (hit) return hit;
  }
  // Prefer Finnish for FI-region devices that only expose region, else EN.
  return "en";
}

type I18nContextValue = {
  locale: Locale;
  dict: Dictionary;
  t: Translator;
  setLocale: (locale: Locale) => void;
  translateCondition: (
    condition: keyof Dictionary["conditions"],
  ) => string;
  translateUv: (uvIndex: number) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start from device language so FI users don't flash English before AsyncStorage loads.
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
    const t = createTranslator(dict);
    return {
      locale,
      dict,
      t,
      setLocale,
      translateCondition: (condition: keyof Dictionary["conditions"]) =>
        translateCondition(dict, condition),
      translateUv: (uvIndex: number) => translateUv(dict, uvIndex),
    };
  }, [locale, setLocale]);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
