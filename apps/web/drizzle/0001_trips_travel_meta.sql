ALTER TABLE "trips" ADD COLUMN "origin_lat" double precision;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "origin_lon" double precision;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "travel_mode" text DEFAULT 'driving';--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "date_preset" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "start_date" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "end_date" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "duration_label" text;