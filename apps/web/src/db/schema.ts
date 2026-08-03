import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  doublePrecision,
  integer,
  jsonb,
  boolean,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Auth.js user (email OTP). Also used as app profile. */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  /** Pro preference: limit discover candidates to origin country. */
  sameCountryOnly: boolean("same_country_only").notNull().default(false),
  /** `user` | `admin` — admin only via DB/migration, never self-service. */
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("accounts_user_id_idx").on(account.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/** Email OTP codes (6-digit), separate from Auth.js magic-link tokens. */
export const emailOtps = pgTable(
  "email_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("email_otps_email_idx").on(t.email)],
);

/** Soft subscription stub for later Stripe. */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    /** free | active | trial | past_due | canceled */
    status: text("status").notNull().default("free"),
    /** none | one_time | monthly */
    plan: text("plan").notNull().default("none"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id"),
    /** Set when one-time Pro was purchased (kept if monthly later cancels). */
    oneTimePaidAt: timestamp("one_time_paid_at", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("subscriptions_stripe_subscription_id_unique")
      .on(t.stripeSubscriptionId)
      .where(sql`${t.stripeSubscriptionId} IS NOT NULL`),
  ],
);

/** Anonymous freemium session tracked via httpOnly cookie. */
export const anonymousSessions = pgTable("anonymous_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  cookieId: text("cookie_id").notNull().unique(),
  searchesUsed: integer("searches_used").notNull().default(0),
  bonusCredits: integer("bonus_credits").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    anonSessionId: uuid("anon_session_id").references(
      () => anonymousSessions.id,
      {
        onDelete: "set null",
      },
    ),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("usage_events_anon_session_type_created_idx").on(
      t.anonSessionId,
      t.type,
      t.createdAt,
    ),
    index("usage_events_user_type_created_idx").on(
      t.userId,
      t.type,
      t.createdAt,
    ),
    index("usage_events_type_created_idx").on(t.type, t.createdAt),
  ],
);

export const shareTokens = pgTable("share_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  creatorSessionId: uuid("creator_session_id").references(
    () => anonymousSessions.id,
    { onDelete: "set null" },
  ),
  redeemedBySessionId: uuid("redeemed_by_session_id").references(
    () => anonymousSessions.id,
    { onDelete: "set null" },
  ),
  maxUses: integer("max_uses").notNull().default(1),
  useCount: integer("use_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Curated / seeded cities for discover (not street OSM). */
export const places = pgTable(
  "places",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    placeName: text("place_name").notNull(),
    country: text("country"),
    countryCode: text("country_code"),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    population: integer("population").notNull().default(0),
    kind: text("kind").notNull().default("city"),
    source: text("source").notNull().default("city_index"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("places_lat_lon_idx").on(t.lat, t.lon),
    index("places_country_code_idx")
      .on(t.countryCode)
      .where(sql`${t.countryCode} IS NOT NULL`),
  ],
);

/** Lazy Wikipedia extras for a place. */
export const placeExtras = pgTable("place_extras", {
  placeId: text("place_id")
    .primaryKey()
    .references(() => places.id, { onDelete: "cascade" }),
  wikipediaUrl: text("wikipedia_url"),
  wikipediaLang: text("wikipedia_lang"),
  thumbnailUrl: text("thumbnail_url"),
  extractShort: text("extract_short"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Saved starting locations / favorites. */
export const savedLocations = pgTable(
  "saved_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    placeName: text("place_name").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    countryCode: text("country_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("saved_locations_user_id_idx").on(t.userId)],
);

/** User-saved trips / discovery results / routes. */
export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    originName: text("origin_name").notNull(),
    destinationName: text("destination_name").notNull(),
    destinationLat: doublePrecision("destination_lat").notNull(),
    destinationLon: doublePrecision("destination_lon").notNull(),
    originLat: doublePrecision("origin_lat"),
    originLon: doublePrecision("origin_lon"),
    weatherGoal: text("weather_goal"),
    travelMode: text("travel_mode").default("driving"),
    datePreset: text("date_preset"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    distanceKm: integer("distance_km"),
    durationLabel: text("duration_label"),
    snapshot: jsonb("snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("trips_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

/** Cached weather snapshots keyed by lat/lon grid (~1 km). */
export const weatherCache = pgTable(
  "weather_cache",
  {
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
  },
  (t) => [index("weather_cache_expires_at_idx").on(t.expiresAt)],
);

/** @deprecated Prefer `users`. Kept as type alias for older imports. */
export const profiles = users;

export type User = typeof users.$inferSelect;
export type Profile = User;
export type Trip = typeof trips.$inferSelect;
export type SavedLocation = typeof savedLocations.$inferSelect;
export type Place = typeof places.$inferSelect;
export type PlaceExtra = typeof placeExtras.$inferSelect;
export type AnonymousSession = typeof anonymousSessions.$inferSelect;
