import {
  pgTable,
  text,
  timestamp,
  uuid,
  doublePrecision,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

/** Profiles linked to auth users (Supabase Auth uid when wired). */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Saved starting locations / favorites. */
export const savedLocations = pgTable("saved_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  name: text("name").notNull(),
  placeName: text("place_name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  countryCode: text("country_code"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** User-saved trips / discovery results. */
export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  title: text("title").notNull(),
  originName: text("origin_name").notNull(),
  destinationName: text("destination_name").notNull(),
  destinationLat: doublePrecision("destination_lat").notNull(),
  destinationLon: doublePrecision("destination_lon").notNull(),
  weatherGoal: text("weather_goal"),
  distanceKm: integer("distance_km"),
  snapshot: jsonb("snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Cached weather snapshots keyed by lat/lon grid. */
export const weatherCache = pgTable("weather_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  cacheKey: text("cache_key").notNull().unique(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  provider: text("provider").notNull(),
  payload: jsonb("payload").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type SavedLocation = typeof savedLocations.$inferSelect;
