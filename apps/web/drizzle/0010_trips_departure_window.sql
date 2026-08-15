ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "departure_start_hour" integer;
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "departure_end_hour" integer;
