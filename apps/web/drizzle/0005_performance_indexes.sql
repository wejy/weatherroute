-- Discover bbox + same-country filter
CREATE INDEX IF NOT EXISTS "places_lat_lon_idx" ON "places" ("lat", "lon");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "places_country_code_idx" ON "places" ("country_code") WHERE "country_code" IS NOT NULL;--> statement-breakpoint

-- OTP lookup / delete by email
CREATE INDEX IF NOT EXISTS "email_otps_email_idx" ON "email_otps" ("email");--> statement-breakpoint

-- User-owned lists + Auth.js cascades
CREATE INDEX IF NOT EXISTS "trips_user_id_created_at_idx" ON "trips" ("user_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_locations_user_id_idx" ON "saved_locations" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" ("user_id");--> statement-breakpoint

-- Freemium quota dedupe
CREATE INDEX IF NOT EXISTS "usage_events_anon_session_type_created_idx"
  ON "usage_events" ("anon_session_id", "type", "created_at");--> statement-breakpoint

-- Weather cache TTL purge / expiry checks
CREATE INDEX IF NOT EXISTS "weather_cache_expires_at_idx" ON "weather_cache" ("expires_at");--> statement-breakpoint

-- Stripe webhook idempotency (nullable unique)
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_unique"
  ON "subscriptions" ("stripe_subscription_id")
  WHERE "stripe_subscription_id" IS NOT NULL;
