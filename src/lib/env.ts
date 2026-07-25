function flag(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  useMocks: flag(process.env.USE_MOCKS, true),
  useMockWeather: flag(process.env.USE_MOCK_WEATHER, false),
  mapboxToken:
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  databaseUrl: process.env.DATABASE_URL || "",
};

export function hasMapbox(): boolean {
  return Boolean(env.mapboxToken) && !env.useMocks;
}

export function hasDatabase(): boolean {
  return Boolean(env.databaseUrl) && !env.useMocks;
}

export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey) && !env.useMocks;
}
