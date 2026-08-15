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

function resolveUseMockWeather(): boolean {
  const enabled = flag(process.env.USE_MOCK_WEATHER, false);
  if (isProduction && enabled) {
    throw new Error(
      "USE_MOCK_WEATHER=true is not allowed in production. Set USE_MOCK_WEATHER=false.",
    );
  }
  return enabled;
}

function resolveEmailMode(): string {
  const mode = (process.env.EMAIL_MODE || "console").toLowerCase();
  if (isProduction && mode === "console") {
    throw new Error(
      "EMAIL_MODE=console is not allowed in production. Use EMAIL_MODE=mailgun (or resend) with the matching API credentials.",
    );
  }
  if (isProduction && mode === "resend" && !process.env.RESEND_API_KEY?.trim()) {
    throw new Error(
      "RESEND_API_KEY is required when EMAIL_MODE=resend in production.",
    );
  }
  if (isProduction && mode === "mailgun") {
    if (!process.env.MAILGUN_API_KEY?.trim()) {
      throw new Error(
        "MAILGUN_API_KEY is required when EMAIL_MODE=mailgun in production.",
      );
    }
    if (!process.env.MAILGUN_DOMAIN?.trim()) {
      throw new Error(
        "MAILGUN_DOMAIN is required when EMAIL_MODE=mailgun in production.",
      );
    }
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
 * Auth.js trustHost.
 * - Production: default **false** — set AUTH_TRUST_HOST=true only behind a trusted
 *   reverse proxy (nginx/Caddy/Vercel) that sets Host / X-Forwarded-Host correctly.
 * - Development: default **true** — Next often binds `0.0.0.0` and you may open
 *   localhost / 127.0.0.1 / LAN IP; without trustHost Auth.js throws UntrustedHost
 *   and OTP “succeeds” without a session cookie.
 * Override anytime with AUTH_TRUST_HOST=true|false.
 */
export function shouldTrustAuthHost(): boolean {
  return flag(process.env.AUTH_TRUST_HOST, !isProduction);
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3004";
  // Expo web commonly uses 8081; also allow 19006 / 8080 / 19000 for Expo tooling.
  return [
    appUrl,
    "http://localhost:3004",
    "http://127.0.0.1:3004",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
    "http://localhost:19000",
    "http://127.0.0.1:19000",
  ];
}

function isPrivateLanHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  // RFC1918 172.16.0.0/12
  const m = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(hostname);
  if (m) {
    const second = Number(m[1]);
    return second >= 16 && second <= 31;
  }
  return false;
}

/**
 * Dev convenience: allow localhost / private LAN origins (Expo web often uses
 * a free port on localhost or the machine LAN IP). Production: allowlist only.
 */
export function isCorsOriginAllowed(origin: string): boolean {
  const allowed = getCorsAllowedOrigins();
  const normalized = origin.replace(/\/$/, "");
  if (allowed.some((o) => o === origin || o === normalized)) return true;
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      isPrivateLanHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3004",
  useMocks: resolveUseMocks(),
  useMockWeather: resolveUseMockWeather(),
  cronEnabled: flag(process.env.CRON_ENABLED, isProduction),
  /** Max places to warm into weather_cache per cron run (hybrid select). */
  cronWeatherWarmLimit: Math.min(
    2000,
    Math.max(50, Number(process.env.CRON_WEATHER_WARM_LIMIT || 400)),
  ),
  emailMode: resolveEmailMode(),
  emailFrom: process.env.EMAIL_FROM || "Solviax.app <noreply@localhost>",
  resendApiKey: process.env.RESEND_API_KEY || "",
  mailgunApiKey: process.env.MAILGUN_API_KEY || "",
  mailgunDomain: process.env.MAILGUN_DOMAIN || "",
  /** EU default; set https://api.mailgun.net for US region */
  mailgunApiBaseUrl:
    process.env.MAILGUN_API_BASE_URL?.trim() ||
    "https://api.eu.mailgun.net",
  authSecret: getAuthSecret(),
  anonDiscoverLimit: Number(process.env.ANON_DISCOVER_LIMIT || 3),
  anonShareBonusCap: Number(process.env.ANON_SHARE_BONUS_CAP || 2),
  anonIpDiscoverLimit: Number(process.env.ANON_IP_DISCOVER_LIMIT || 10),
  /** Max new wt_anon / X-Solviax-Anon sessions per IP per 24h */
  anonSessionMintLimit: Number(process.env.ANON_SESSION_MINT_LIMIT || 20),
  /** Calendar-month discover searches for signed-in Free users */
  freeMonthlyDiscoverLimit: Number(
    process.env.FREE_MONTHLY_DISCOVER_LIMIT || 50,
  ),
  /** Calendar-month discover searches for Monthly Pro (fair-use; soft-marketed) */
  proMonthlyDiscoverLimit: Number(
    process.env.PRO_MONTHLY_DISCOVER_LIMIT || 200,
  ),
  /** Discover searches for One-time Pro within the 60-day window (soft-marketed) */
  proOneTimeDiscoverLimit: Number(
    process.env.PRO_ONE_TIME_DISCOVER_LIMIT || 400,
  ),
  /** UTC-month route lookups for anonymous users */
  anonMonthlyRouteLimit: Number(process.env.ANON_MONTHLY_ROUTE_LIMIT || 30),
  /** Per-IP route lookups / 24h (cookie-rotation defense) */
  anonIpRouteLimit: Number(process.env.ANON_IP_ROUTE_LIMIT || 20),
  /** UTC-month route lookups for signed-in Free users */
  freeMonthlyRouteLimit: Number(process.env.FREE_MONTHLY_ROUTE_LIMIT || 50),
  /** UTC-month route lookups for Pro (one_time + monthly) */
  proMonthlyRouteLimit: Number(process.env.PRO_MONTHLY_ROUTE_LIMIT || 500),
  /** Admin dashboard fixed monthly costs (EUR) — see ADMIN_COST_* */
  adminCostServerEur: Number(process.env.ADMIN_COST_SERVER_EUR || 15),
  adminCostDatabaseEur: Number(process.env.ADMIN_COST_DATABASE_EUR || 10),
  adminCostUpstashEur: Number(process.env.ADMIN_COST_UPSTASH_EUR || 0),
  adminCostOtherEur: Number(process.env.ADMIN_COST_OTHER_EUR || 5),
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
