ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "instance_id" text;
CREATE INDEX IF NOT EXISTS "idx_telemetry_instance" ON "telemetry_events" ("org_id", "instance_id");
