ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_tool_calls" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_successful_tool_calls" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_failed_tool_calls" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_duration_ms" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_session_starts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_session_ends" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_session_duration_ms" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_tokens_total" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
INSERT INTO "telemetry_daily" (
  "org_id",
  "date",
  "total_tool_calls",
  "total_successful_tool_calls",
  "total_failed_tool_calls",
  "total_duration_ms",
  "total_session_starts",
  "total_session_ends",
  "total_session_duration_ms",
  "total_searches",
  "total_related_lookups",
  "total_rule_lookups",
  "total_reloads",
  "total_caller_lookups",
  "total_trace_lookups",
  "total_impact_analyses",
  "total_results_returned",
  "total_tokens_saved",
  "total_tokens_total",
  "push_count"
)
SELECT
  "org_id",
  date("period_start" at time zone 'UTC'),
  coalesce(sum("total_tool_calls"), 0),
  coalesce(sum("successful_tool_calls"), 0),
  coalesce(sum("failed_tool_calls"), 0),
  coalesce(sum("total_duration_ms"), 0),
  coalesce(sum("session_starts"), 0),
  coalesce(sum("session_ends"), 0),
  coalesce(sum("session_duration_ms_total"), 0),
  coalesce(sum("searches"), 0),
  coalesce(sum("related_lookups"), 0),
  coalesce(sum("rule_lookups"), 0),
  coalesce(sum("reloads"), 0),
  coalesce(sum("caller_lookups"), 0),
  coalesce(sum("trace_lookups"), 0),
  coalesce(sum("impact_analyses"), 0),
  coalesce(sum("total_results_returned"), 0),
  coalesce(sum("estimated_tokens_saved"), 0),
  coalesce(sum("estimated_tokens_total"), 0),
  count(*)
FROM "telemetry_events"
GROUP BY "org_id", date("period_start" at time zone 'UTC')
ON CONFLICT ("org_id", "date") DO UPDATE SET
  "total_tool_calls" = excluded."total_tool_calls",
  "total_successful_tool_calls" = excluded."total_successful_tool_calls",
  "total_failed_tool_calls" = excluded."total_failed_tool_calls",
  "total_duration_ms" = excluded."total_duration_ms",
  "total_session_starts" = excluded."total_session_starts",
  "total_session_ends" = excluded."total_session_ends",
  "total_session_duration_ms" = excluded."total_session_duration_ms",
  "total_searches" = excluded."total_searches",
  "total_related_lookups" = excluded."total_related_lookups",
  "total_rule_lookups" = excluded."total_rule_lookups",
  "total_reloads" = excluded."total_reloads",
  "total_caller_lookups" = excluded."total_caller_lookups",
  "total_trace_lookups" = excluded."total_trace_lookups",
  "total_impact_analyses" = excluded."total_impact_analyses",
  "total_results_returned" = excluded."total_results_returned",
  "total_tokens_saved" = excluded."total_tokens_saved",
  "total_tokens_total" = excluded."total_tokens_total",
  "push_count" = excluded."push_count";
