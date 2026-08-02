ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "same_country_only" boolean DEFAULT false NOT NULL;
