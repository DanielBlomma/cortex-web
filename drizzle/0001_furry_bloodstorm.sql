ALTER TABLE "telemetry_daily" ADD COLUMN "total_caller_lookups" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD COLUMN "total_trace_lookups" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD COLUMN "total_impact_analyses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD COLUMN "caller_lookups" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD COLUMN "trace_lookups" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD COLUMN "impact_analyses" integer DEFAULT 0 NOT NULL;