import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import {
  darkColors,
  lightColors,
  type AppColors,
} from "@/constants/Colors";

const STORAGE_KEY = "wt_theme_preference";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  colors: AppColors;
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function parsePreference(raw: string | null): ThemePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function resolve(
  preference: ThemePreference,
  system: "light" | "dark" | null | undefined,
): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return system === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const systemResolved =
    systemScheme === "dark"
      ? "dark"
      : systemScheme === "light"
        ? "light"
        : undefined;
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      setPreferenceState(parsePreference(raw));
      setReady(true);
    });
  }, []);

  const resolved = resolve(preference, systemResolved);
  const colors = resolved === "dark" ? darkColors : lightColors;

  useEffect(() => {
    if (!ready) return;
    // Drive native chrome (status bar / form controls) when not following system.
    if (preference === "system") {
      Appearance.setColorScheme("unspecified");
    } else {
      Appearance.setColorScheme(preference);
    }
  }, [preference, ready]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, colors, setPreference }),
    [preference, resolved, colors, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function useColors(): AppColors {
  return useTheme().colors;
}
