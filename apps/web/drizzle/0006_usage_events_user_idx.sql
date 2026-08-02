-- Free-tier monthly discover counting (usage_events by user)
CREATE INDEX IF NOT EXISTS "usage_events_user_type_created_idx"
  ON "usage_events" ("user_id", "type", "created_at");
