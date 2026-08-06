export const THEME_COOKIE = "wt_theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  const v = raw?.trim().toLowerCase();
  return isThemePreference(v) ? v : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemDark ? "dark" : "light";
}

/** Inline boot script — set data-theme before paint to avoid flash. */
export const THEME_BOOT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var p=m?decodeURIComponent(m[1]):"system";if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var dark=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var t=dark?"dark":"light";document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export function themeCookieMaxAgeSeconds(): number {
  return 60 * 60 * 24 * 365;
}

export function mapboxStyleForTheme(theme: ResolvedTheme): string {
  return theme === "dark"
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";
}

/**
 * dark-v11 reads quite crushed under our panels — lift the basemap a notch
 * without switching styles (HTML markers/popups stay unaffected).
 */
export const mapboxDarkBasemapClass =
  "[&_canvas.mapboxgl-canvas]:brightness-[1.22] [&_canvas.mapboxgl-canvas]:contrast-[0.92] [&_canvas.mapboxgl-canvas]:saturate-[0.88]";
