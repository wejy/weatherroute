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

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  useMocks: flag(process.env.USE_MOCKS, true),
  useMockWeather: flag(process.env.USE_MOCK_WEATHER, false),
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
