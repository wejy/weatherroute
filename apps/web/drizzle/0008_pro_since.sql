ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pro_since" timestamp with time zone;--> statement-breakpoint
UPDATE "subscriptions"
SET "pro_since" = COALESCE("one_time_paid_at", "updated_at")
WHERE "pro_since" IS NULL
  AND "plan" IN ('one_time', 'monthly')
  AND "status" IN ('active', 'trial', 'past_due');
