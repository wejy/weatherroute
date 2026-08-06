/**
 * Absolute site origin for sitemap, robots, canonicals, and Open Graph.
 * Prefer NEXT_PUBLIC_APP_URL; never emit localhost in production builds.
 */
export function getSiteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  const isLocal =
    !configured ||
    /localhost|127\.0\.0\.1/i.test(configured) ||
    configured.startsWith("http://0.0.0.0");

  if (configured && !isLocal) return configured;

  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) {
    return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://solviax.app";
  }

  return configured || "http://localhost:3004";
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
