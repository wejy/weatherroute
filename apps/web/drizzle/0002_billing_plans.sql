ALTER TABLE "subscriptions" ADD COLUMN "plan" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "one_time_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "current_period_end" timestamp with time zone;--> statement-breakpoint
UPDATE "subscriptions" SET "plan" = 'monthly' WHERE "status" IN ('active', 'trial') AND ("plan" IS NULL OR "plan" = 'none');
