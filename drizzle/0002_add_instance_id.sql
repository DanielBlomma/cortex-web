ALTER TABLE "telemetry_events" ADD COLUMN "instance_id" text;
CREATE INDEX "idx_telemetry_instance" ON "telemetry_events" ("org_id", "instance_id");
