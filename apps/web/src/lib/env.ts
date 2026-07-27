function flag(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

const isProduction = process.env.NODE_ENV === "production";

/** Public token for Mapbox GL in the browser (must start with pk.). */
export function getMapboxPublicToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || "";
}

/** Server-side token for Geocoding etc. (pk. or sk.). */
export function getMapboxServerToken(): string {
  const server = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (server) return server;
  const pub = getMapboxPublicToken();
  if (pub && !pub.startsWith("sk.")) return pub;
  return "";
}

/** Mocks default on only when no DATABASE_URL — local parity uses Postgres. */
const defaultUseMocks = !process.env.DATABASE_URL;

function resolveUseMocks(): boolean {
  if (isProduction && flag(process.env.USE_MOCKS, false)) {
    throw new Error(
      "USE_MOCKS=true is not allowed in production. Set USE_MOCKS=false.",
    );
  }
  return flag(process.env.USE_MOCKS, defaultUseMocks);
}

function resolveEmailMode(): string {
  const mode = (process.env.EMAIL_MODE || "console").toLowerCase();
  if (isProduction && mode === "console") {
    throw new Error(
      "EMAIL_MODE=console is not allowed in production. Use EMAIL_MODE=resend with RESEND_API_KEY.",
    );
  }
  if (isProduction && mode === "resend" && !process.env.RESEND_API_KEY?.trim()) {
    throw new Error("RESEND_API_KEY is required when EMAIL_MODE=resend in production.");
  }
  return mode;
}

/** Local dev default — matches pre-audit Auth.js fallback (keeps existing cookies working). */
const DEV_AUTH_SECRET = "dev-insecure-secret";

/** Auth.js secret — fail closed in production. */
export function getAuthSecret(): string {
  const secret = (process.env.AUTH_SECRET || "").trim();
  if (isProduction) {
    if (!secret || secret.length < 32) {
      throw new Error(
        "AUTH_SECRET must be set to a random string of at least 32 characters in production.",
      );
    }
    return secret;
  }
  if (secret.length >= 32) return secret;
  return DEV_AUTH_SECRET;
}

/**
 * Auth.js trustHost — default false (safe).
 * Set AUTH_TRUST_HOST=true only behind a trusted reverse proxy that sets Host correctly
 * (e.g. Vercel, Cloudflare, nginx). Never enable on a publicly reachable origin that
 * can be spoofed via Host header.
 */
export function shouldTrustAuthHost(): boolean {
  return flag(process.env.AUTH_TRUST_HOST, false);
}

/** Comma-separated origins for CORS (API). Falls back to app URL + local dev. */
export function getCorsAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return [
    appUrl,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
  ];
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  useMocks: resolveUseMocks(),
  useMockWeather: flag(process.env.USE_MOCK_WEATHER, false),
  cronEnabled: flag(process.env.CRON_ENABLED, isProduction),
  emailMode: resolveEmailMode(),
  emailFrom: process.env.EMAIL_FROM || "WeatherTrip <noreply@localhost>",
  resendApiKey: process.env.RESEND_API_KEY || "",
  authSecret: getAuthSecret(),
  anonDiscoverLimit: Number(process.env.ANON_DISCOVER_LIMIT || 3),
  anonShareBonusCap: Number(process.env.ANON_SHARE_BONUS_CAP || 2),
  anonIpDiscoverLimit: Number(process.env.ANON_IP_DISCOVER_LIMIT || 10),
  mapboxToken: getMapboxServerToken(),
  mapboxPublicToken: getMapboxPublicToken(),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  databaseUrl: process.env.DATABASE_URL || "",
  isProduction,
};

/** Server geocoding / Mapbox APIs — available whenever any Mapbox token is set. */
export function hasMapbox(): boolean {
  return Boolean(getMapboxServerToken());
}

/** Interactive Mapbox GL map — requires a public pk. token in NEXT_PUBLIC_MAPBOX_TOKEN. */
export function hasMapboxMap(): boolean {
  return getMapboxPublicToken().startsWith("pk.");
}

export function hasDatabase(): boolean {
  return Boolean(env.databaseUrl) && !env.useMocks;
}

export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey) && !env.useMocks;
}

/** Reject sk. tokens in URLs or responses sent to clients. */
export function assertPublicMapboxToken(token: string): string {
  if (!token.startsWith("pk.")) {
    throw new Error("Mapbox public token must start with pk.");
  }
  return token;
}
