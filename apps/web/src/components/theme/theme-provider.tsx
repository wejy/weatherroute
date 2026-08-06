"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  parseThemePreference,
  resolveTheme,
  themeCookieMaxAgeSeconds,
  THEME_COOKIE,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readCookiePreference(): ThemePreference {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`),
  );
  return parseThemePreference(
    match ? decodeURIComponent(match[1]!) : "system",
  );
}

function writeCookiePreference(preference: ThemePreference) {
  const maxAge = themeCookieMaxAgeSeconds();
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(preference)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function applyDomTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({
  children,
  initialPreference = "system",
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    initialPreference,
  );
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setPreferenceState(readCookiePreference());
    setSystemDark(systemPrefersDark());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = useMemo(
    () => resolveTheme(preference, systemDark),
    [preference, systemDark],
  );

  useEffect(() => {
    applyDomTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeCookiePreference(next);
    applyDomTheme(resolveTheme(next, systemPrefersDark()));
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
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

/** Safe for map components that may render outside provider in tests. */
export function useResolvedTheme(): ResolvedTheme {
  const ctx = useContext(ThemeContext);
  const [fallback, setFallback] = useState<ResolvedTheme>("light");
  useEffect(() => {
    if (ctx) return;
    const pref = readCookiePreference();
    setFallback(resolveTheme(pref, systemPrefersDark()));
  }, [ctx]);
  return ctx?.resolved ?? fallback;
}
