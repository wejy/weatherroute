import type { Locale } from "./types";
import { defaultLocale, locales } from "./types";

/** Map BCP-47 / Accept-Language tags to a supported app locale. */
export function localeFromTag(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
  if ((locales as readonly string[]).includes(primary)) {
    return primary as Locale;
  }
  return null;
}

/**
 * Parse an Accept-Language header (or comma-separated list) and pick the
 * best supported locale. Falls back to defaultLocale when nothing matches.
 */
export function resolveLocaleFromAcceptLanguage(
  header: string | null | undefined,
  fallback: Locale = defaultLocale,
): Locale {
  if (!header?.trim()) return fallback;

  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.split("=")[1]) : 1;
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag && c.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const hit = localeFromTag(tag);
    if (hit) return hit;
  }
  return fallback;
}
