function flag(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

/** Public token for Mapbox GL in the browser (must start with pk.). */
export function getMapboxPublicToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || "";
}

/** Server-side token for Geocoding etc. (pk. or sk.). */
export function getMapboxServerToken(): string {
  return (
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    ""
  );
}

/** Mocks default on only when no DATABASE_URL — local parity uses Postgres. */
const defaultUseMocks = !process.env.DATABASE_URL;

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  useMocks: flag(process.env.USE_MOCKS, defaultUseMocks),
  useMockWeather: flag(process.env.USE_MOCK_WEATHER, false),
  cronEnabled: flag(process.env.CRON_ENABLED, process.env.NODE_ENV === "production"),
  emailMode: (process.env.EMAIL_MODE || "console").toLowerCase(),
  emailFrom: process.env.EMAIL_FROM || "WeatherTrip <noreply@localhost>",
  resendApiKey: process.env.RESEND_API_KEY || "",
  authSecret: process.env.AUTH_SECRET || "",
  anonDiscoverLimit: Number(process.env.ANON_DISCOVER_LIMIT || 3),
  anonShareBonusCap: Number(process.env.ANON_SHARE_BONUS_CAP || 2),
  mapboxToken: getMapboxServerToken(),
  mapboxPublicToken: getMapboxPublicToken(),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  databaseUrl: process.env.DATABASE_URL || "",
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
