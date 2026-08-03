ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
UPDATE "users" SET "role" = 'admin' WHERE "email" = 'felsen@duck.com';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_events_type_created_idx" ON "usage_events" ("type", "created_at");
