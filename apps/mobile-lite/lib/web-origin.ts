/**
 * Canonical web origin loaded in the WebView (no trailing slash).
 */
export function getWebOrigin(): string {
  const raw = process.env.EXPO_PUBLIC_WEB_URL?.trim().replace(/\/$/, "");
  if (raw) return raw;
  return "";
}

export const LITE_SCHEME = "solviaxlite";

/** User-Agent suffix so web can detect the lite shell if needed. */
export const LITE_USER_AGENT_SUFFIX = "SolviaxLite/0.1";

/** Absolute http(s) URL tagged with webview=1 (and optional lang). */
export function initialWebUrl(absoluteUrl: string, locale?: string): string {
  const url = new URL(absoluteUrl);
  url.searchParams.set("webview", "1");
  if (locale === "en" || locale === "fi") {
    url.searchParams.set("lang", locale);
  }
  return url.toString();
}

export function webPathUrl(
  origin: string,
  path: string,
  locale?: string,
): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${origin}/`);
  return initialWebUrl(url.toString(), locale);
}

/** Map solviaxlite://pro?x=1 → https://host/pro?x=1&webview=1 */
export function deepLinkToWebUrl(origin: string, url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${LITE_SCHEME}:`) return null;
    const path = parsed.hostname
      ? `/${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`
      : parsed.pathname || "/";
    const target = new URL(path.replace(/\/+/g, "/"), `${origin}/`);
    parsed.searchParams.forEach((v, k) => target.searchParams.set(k, v));
    target.searchParams.set("webview", "1");
    return target.toString();
  } catch {
    return null;
  }
}
