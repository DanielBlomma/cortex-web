import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// Idempotent data migrations. Safe to run multiple times — all statements
// are no-ops after first successful run.

// Historical: ensure telemetry columns exist (predates drizzle-kit push in build).
await sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "environment" text DEFAULT 'production' NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_tool_calls" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_successful_tool_calls" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_failed_tool_calls" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_duration_ms" bigint DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_session_starts" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_session_ends" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_session_duration_ms" bigint DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_caller_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_trace_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_impact_analyses" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_tokens_total" bigint DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "caller_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "trace_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "impact_analyses" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "total_tool_calls" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "successful_tool_calls" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "failed_tool_calls" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "total_duration_ms" bigint DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "session_starts" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "session_ends" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "session_duration_ms_total" bigint DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "api_key_environment" text`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "session_id" text`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "tool_metrics" jsonb`;
await sql`ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "title" text DEFAULT 'Untitled Policy' NOT NULL`;
await sql`ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'custom' NOT NULL`;
await sql`ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL`;
await sql`ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "severity" text DEFAULT 'block' NOT NULL`;
await sql`ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "api_key_environment" text`;
await sql`ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "instance_id" text`;
await sql`ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "session_id" text`;
await sql`ALTER TABLE "policy_violations" ADD COLUMN IF NOT EXISTS "api_key_environment" text`;
await sql`ALTER TABLE "policy_violations" ADD COLUMN IF NOT EXISTS "instance_id" text`;
await sql`ALTER TABLE "policy_violations" ADD COLUMN IF NOT EXISTS "session_id" text`;
await sql`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "api_key_id" uuid REFERENCES "api_keys"("id") ON DELETE SET NULL`;
await sql`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "api_key_environment" text`;
await sql`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'web' NOT NULL`;
await sql`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "event_type" text`;
await sql`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "evidence_level" text DEFAULT 'diagnostic' NOT NULL`;
await sql`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "repo" text`;
await sql`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "instance_id" text`;
await sql`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "session_id" text`;
await sql`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "occurred_at" timestamptz DEFAULT now() NOT NULL`;
await sql`
  CREATE TABLE IF NOT EXISTS "operations_snapshots" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "active_api_keys" integer DEFAULT 0 NOT NULL,
    "active_policies" integer DEFAULT 0 NOT NULL,
    "enforced_policies" integer DEFAULT 0 NOT NULL,
    "blocking_policies" integer DEFAULT 0 NOT NULL,
    "active_instances" integer DEFAULT 0 NOT NULL,
    "distinct_versions" integer DEFAULT 0 NOT NULL,
    "total_tool_calls" bigint DEFAULT 0 NOT NULL,
    "failed_tool_calls" bigint DEFAULT 0 NOT NULL,
    "workflow_sessions_30d" integer DEFAULT 0 NOT NULL,
    "reviewed_sessions_30d" integer DEFAULT 0 NOT NULL,
    "approved_sessions_30d" integer DEFAULT 0 NOT NULL,
    "blocked_sessions_30d" integer DEFAULT 0 NOT NULL,
    "required_audit_events_30d" integer DEFAULT 0 NOT NULL,
    "last_policy_sync_at" timestamptz,
    "last_telemetry_at" timestamptz,
    "last_audit_at" timestamptz,
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS "violations_daily" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "date" date NOT NULL,
    "total_count" integer DEFAULT 0 NOT NULL,
    "error_count" integer DEFAULT 0 NOT NULL,
    "warning_count" integer DEFAULT 0 NOT NULL,
    "info_count" integer DEFAULT 0 NOT NULL
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS "reviews_daily" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "date" date NOT NULL,
    "total_count" integer DEFAULT 0 NOT NULL,
    "passed_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "error_count" integer DEFAULT 0 NOT NULL,
    "warning_count" integer DEFAULT 0 NOT NULL
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS "policy_rule_stats" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "rule_id" text NOT NULL,
    "review_failure_count" integer DEFAULT 0 NOT NULL,
    "warning_review_count" integer DEFAULT 0 NOT NULL,
    "last_review_at" timestamptz,
    "violation_count" integer DEFAULT 0 NOT NULL,
    "last_violation_at" timestamptz,
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS "audit_daily" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "date" date NOT NULL,
    "total_count" integer DEFAULT 0 NOT NULL,
    "required_count" integer DEFAULT 0 NOT NULL,
    "diagnostic_count" integer DEFAULT 0 NOT NULL,
    "client_count" integer DEFAULT 0 NOT NULL,
    "web_count" integer DEFAULT 0 NOT NULL,
    "last_occurred_at" timestamptz,
    "last_policy_sync_at" timestamptz
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS "workflow_snapshots" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "api_key_id" uuid REFERENCES "api_keys"("id") ON DELETE SET NULL,
    "api_key_environment" text,
    "repo" text,
    "instance_id" text,
    "session_id" text,
    "phase" text NOT NULL,
    "approval_status" text NOT NULL,
    "plan_status" text NOT NULL,
    "review_status" text NOT NULL,
    "blocked_reasons" jsonb,
    "snapshot" jsonb NOT NULL,
    "received_at" timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS "workflow_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "session_id" text NOT NULL,
    "repo" text,
    "instance_id" text,
    "phase" text NOT NULL,
    "approval_status" text NOT NULL,
    "plan_status" text NOT NULL,
    "review_status" text NOT NULL,
    "blocked_reasons" jsonb,
    "last_received_at" timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS "idx_audit_log_org_time" ON "audit_log" ("org_id", "occurred_at")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_audit_log_resource" ON "audit_log" ("org_id", "resource_type", "resource_id")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_audit_log_session" ON "audit_log" ("org_id", "session_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_audit_daily_org_date" ON "audit_daily" ("org_id", "date")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_audit_daily_org" ON "audit_daily" ("org_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_operations_snapshots_org" ON "operations_snapshots" ("org_id")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_operations_snapshots_updated" ON "operations_snapshots" ("updated_at")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_violations_daily_org_date" ON "violations_daily" ("org_id", "date")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_violations_daily_org" ON "violations_daily" ("org_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_reviews_daily_org_date" ON "reviews_daily" ("org_id", "date")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_reviews_daily_org" ON "reviews_daily" ("org_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_policy_rule_stats_org_rule" ON "policy_rule_stats" ("org_id", "rule_id")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_policy_rule_stats_org" ON "policy_rule_stats" ("org_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_workflow_sessions_org_session" ON "workflow_sessions" ("org_id", "session_id")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_workflow_sessions_org_time" ON "workflow_sessions" ("org_id", "last_received_at")`;
await sql`
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
    "push_count" = excluded."push_count"
`;
await sql`
  INSERT INTO "operations_snapshots" (
    "org_id",
    "active_api_keys",
    "active_policies",
    "enforced_policies",
    "blocking_policies",
    "active_instances",
    "distinct_versions",
    "total_tool_calls",
    "failed_tool_calls",
    "workflow_sessions_30d",
    "reviewed_sessions_30d",
    "approved_sessions_30d",
    "blocked_sessions_30d",
    "required_audit_events_30d",
    "last_policy_sync_at",
    "last_telemetry_at",
    "last_audit_at",
    "updated_at"
  )
  SELECT
    o."id",
    coalesce(key_stats."active_api_keys", 0),
    coalesce(policy_stats."active_policies", 0),
    coalesce(policy_stats."enforced_policies", 0),
    coalesce(policy_stats."blocking_policies", 0),
    coalesce(telemetry_activity."active_instances", 0),
    coalesce(telemetry_activity."distinct_versions", 0),
    coalesce(telemetry_rollups."total_tool_calls", 0),
    coalesce(telemetry_rollups."failed_tool_calls", 0),
    coalesce(workflow_stats."workflow_sessions_30d", 0),
    coalesce(review_stats."reviewed_sessions_30d", 0),
    coalesce(workflow_stats."approved_sessions_30d", 0),
    coalesce(workflow_stats."blocked_sessions_30d", 0),
    coalesce(audit_stats."required_audit_events_30d", 0),
    audit_stats."last_policy_sync_at",
    telemetry_activity."last_telemetry_at",
    audit_stats."last_audit_at",
    now()
  FROM "organizations" o
  LEFT JOIN (
    SELECT "org_id", count(*) FILTER (WHERE "revoked_at" IS NULL) AS "active_api_keys"
    FROM "api_keys"
    GROUP BY "org_id"
  ) key_stats ON key_stats."org_id" = o."id"
  LEFT JOIN (
    SELECT
      "org_id",
      count(*) FILTER (WHERE "status" = 'active') AS "active_policies",
      count(*) FILTER (WHERE "status" = 'active' AND "enforce" = true) AS "enforced_policies",
      count(*) FILTER (WHERE "status" = 'active' AND "severity" IN ('block', 'error')) AS "blocking_policies"
    FROM "policies"
    GROUP BY "org_id"
  ) policy_stats ON policy_stats."org_id" = o."id"
  LEFT JOIN (
    SELECT
      "org_id",
      count(DISTINCT coalesce("instance_id", "api_key_id"::text)) AS "active_instances",
      count(DISTINCT "client_version") FILTER (WHERE "client_version" IS NOT NULL) AS "distinct_versions",
      max("received_at") AS "last_telemetry_at"
    FROM "telemetry_events"
    GROUP BY "org_id"
  ) telemetry_activity ON telemetry_activity."org_id" = o."id"
  LEFT JOIN (
    SELECT
      "org_id",
      coalesce(sum("total_tool_calls"), 0) AS "total_tool_calls",
      coalesce(sum("total_failed_tool_calls"), 0) AS "failed_tool_calls"
    FROM "telemetry_daily"
    GROUP BY "org_id"
  ) telemetry_rollups ON telemetry_rollups."org_id" = o."id"
  LEFT JOIN (
    SELECT
      "org_id",
      max("occurred_at") AS "last_audit_at",
      max("occurred_at") FILTER (WHERE "event_type" = 'policy_sync') AS "last_policy_sync_at",
      count(*) FILTER (WHERE "evidence_level" = 'required' AND "occurred_at" >= now() - interval '30 days') AS "required_audit_events_30d"
    FROM "audit_log"
    GROUP BY "org_id"
  ) audit_stats ON audit_stats."org_id" = o."id"
  LEFT JOIN (
    SELECT
      "org_id",
      count(DISTINCT "session_id") AS "workflow_sessions_30d",
      count(DISTINCT "session_id") FILTER (WHERE "approval_status" = 'approved') AS "approved_sessions_30d",
      count(DISTINCT "session_id") FILTER (WHERE "approval_status" = 'blocked') AS "blocked_sessions_30d"
    FROM "workflow_snapshots"
    WHERE "received_at" >= now() - interval '30 days'
    GROUP BY "org_id"
  ) workflow_stats ON workflow_stats."org_id" = o."id"
  LEFT JOIN (
    SELECT
      "org_id",
      count(DISTINCT "session_id") AS "reviewed_sessions_30d"
    FROM "reviews"
    WHERE "reviewed_at" >= now() - interval '30 days'
    GROUP BY "org_id"
  ) review_stats ON review_stats."org_id" = o."id"
  ON CONFLICT ("org_id") DO UPDATE SET
    "active_api_keys" = excluded."active_api_keys",
    "active_policies" = excluded."active_policies",
    "enforced_policies" = excluded."enforced_policies",
    "blocking_policies" = excluded."blocking_policies",
    "active_instances" = excluded."active_instances",
    "distinct_versions" = excluded."distinct_versions",
    "total_tool_calls" = excluded."total_tool_calls",
    "failed_tool_calls" = excluded."failed_tool_calls",
    "workflow_sessions_30d" = excluded."workflow_sessions_30d",
    "reviewed_sessions_30d" = excluded."reviewed_sessions_30d",
    "approved_sessions_30d" = excluded."approved_sessions_30d",
    "blocked_sessions_30d" = excluded."blocked_sessions_30d",
    "required_audit_events_30d" = excluded."required_audit_events_30d",
    "last_policy_sync_at" = excluded."last_policy_sync_at",
    "last_telemetry_at" = excluded."last_telemetry_at",
    "last_audit_at" = excluded."last_audit_at",
    "updated_at" = excluded."updated_at"
`;
await sql`
  INSERT INTO "violations_daily" (
    "org_id",
    "date",
    "total_count",
    "error_count",
    "warning_count",
    "info_count"
  )
  SELECT
    "org_id",
    date("occurred_at" at time zone 'UTC'),
    count(*),
    count(*) FILTER (WHERE "severity" = 'error'),
    count(*) FILTER (WHERE "severity" = 'warning'),
    count(*) FILTER (WHERE "severity" = 'info')
  FROM "policy_violations"
  GROUP BY "org_id", date("occurred_at" at time zone 'UTC')
  ON CONFLICT ("org_id", "date") DO UPDATE SET
    "total_count" = excluded."total_count",
    "error_count" = excluded."error_count",
    "warning_count" = excluded."warning_count",
    "info_count" = excluded."info_count"
`;
await sql`
  INSERT INTO "reviews_daily" (
    "org_id",
    "date",
    "total_count",
    "passed_count",
    "failed_count",
    "error_count",
    "warning_count"
  )
  SELECT
    "org_id",
    date("reviewed_at" at time zone 'UTC'),
    count(*),
    count(*) FILTER (WHERE "pass" = true),
    count(*) FILTER (WHERE "pass" = false),
    count(*) FILTER (WHERE "pass" = false AND "severity" = 'error'),
    count(*) FILTER (WHERE "pass" = false AND "severity" = 'warning')
  FROM "reviews"
  GROUP BY "org_id", date("reviewed_at" at time zone 'UTC')
  ON CONFLICT ("org_id", "date") DO UPDATE SET
    "total_count" = excluded."total_count",
    "passed_count" = excluded."passed_count",
    "failed_count" = excluded."failed_count",
    "error_count" = excluded."error_count",
    "warning_count" = excluded."warning_count"
`;
await sql`
  INSERT INTO "policy_rule_stats" (
    "org_id",
    "rule_id",
    "review_failure_count",
    "warning_review_count",
    "last_review_at",
    "violation_count",
    "last_violation_at",
    "updated_at"
  )
  SELECT
    rules."org_id",
    rules."rule_id",
    coalesce(review_stats."review_failure_count", 0),
    coalesce(review_stats."warning_review_count", 0),
    review_stats."last_review_at",
    coalesce(violation_stats."violation_count", 0),
    violation_stats."last_violation_at",
    now()
  FROM (
    SELECT DISTINCT "org_id", "policy_id" AS "rule_id" FROM "reviews"
    UNION
    SELECT DISTINCT "org_id", "rule_id" FROM "policy_violations"
  ) rules
  LEFT JOIN (
    SELECT
      "org_id",
      "policy_id" AS "rule_id",
      count(*) FILTER (WHERE "pass" = false AND "severity" = 'error') AS "review_failure_count",
      count(*) FILTER (WHERE "pass" = false AND "severity" = 'warning') AS "warning_review_count",
      max("reviewed_at") AS "last_review_at"
    FROM "reviews"
    GROUP BY "org_id", "policy_id"
  ) review_stats ON review_stats."org_id" = rules."org_id" AND review_stats."rule_id" = rules."rule_id"
  LEFT JOIN (
    SELECT
      "org_id",
      "rule_id",
      count(*) AS "violation_count",
      max("occurred_at") AS "last_violation_at"
    FROM "policy_violations"
    GROUP BY "org_id", "rule_id"
  ) violation_stats ON violation_stats."org_id" = rules."org_id" AND violation_stats."rule_id" = rules."rule_id"
  ON CONFLICT ("org_id", "rule_id") DO UPDATE SET
    "review_failure_count" = excluded."review_failure_count",
    "warning_review_count" = excluded."warning_review_count",
    "last_review_at" = excluded."last_review_at",
    "violation_count" = excluded."violation_count",
    "last_violation_at" = excluded."last_violation_at",
    "updated_at" = excluded."updated_at"
`;
await sql`
  INSERT INTO "audit_daily" (
    "org_id",
    "date",
    "total_count",
    "required_count",
    "diagnostic_count",
    "client_count",
    "web_count",
    "last_occurred_at",
    "last_policy_sync_at"
  )
  SELECT
    "org_id",
    date("occurred_at" at time zone 'UTC'),
    count(*),
    count(*) FILTER (WHERE "evidence_level" = 'required'),
    count(*) FILTER (WHERE "evidence_level" = 'diagnostic'),
    count(*) FILTER (WHERE "source" = 'client'),
    count(*) FILTER (WHERE "source" = 'web'),
    max("occurred_at"),
    max("occurred_at") FILTER (WHERE "event_type" = 'policy_sync')
  FROM "audit_log"
  GROUP BY "org_id", date("occurred_at" at time zone 'UTC')
  ON CONFLICT ("org_id", "date") DO UPDATE SET
    "total_count" = excluded."total_count",
    "required_count" = excluded."required_count",
    "diagnostic_count" = excluded."diagnostic_count",
    "client_count" = excluded."client_count",
    "web_count" = excluded."web_count",
    "last_occurred_at" = excluded."last_occurred_at",
    "last_policy_sync_at" = excluded."last_policy_sync_at"
`;
await sql`
  INSERT INTO "workflow_sessions" (
    "org_id",
    "session_id",
    "repo",
    "instance_id",
    "phase",
    "approval_status",
    "plan_status",
    "review_status",
    "blocked_reasons",
    "last_received_at"
  )
  SELECT DISTINCT ON ("org_id", "session_id")
    "org_id",
    "session_id",
    "repo",
    "instance_id",
    "phase",
    "approval_status",
    "plan_status",
    "review_status",
    "blocked_reasons",
    "received_at"
  FROM "workflow_snapshots"
  WHERE "session_id" IS NOT NULL
  ORDER BY "org_id", "session_id", "received_at" DESC
  ON CONFLICT ("org_id", "session_id") DO UPDATE SET
    "repo" = excluded."repo",
    "instance_id" = excluded."instance_id",
    "phase" = excluded."phase",
    "approval_status" = excluded."approval_status",
    "plan_status" = excluded."plan_status",
    "review_status" = excluded."review_status",
    "blocked_reasons" = excluded."blocked_reasons",
    "last_received_at" = excluded."last_received_at"
`;

// Rename predefined rule IDs to match cortex-enterprise validator registry.
// See cortex-enterprise/packages/core/src/validators/builtins.ts.
await sql`UPDATE "policies" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`;
await sql`UPDATE "policies" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`;
await sql`UPDATE "policy_violations" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`;
await sql`UPDATE "policy_violations" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`;

console.log("Migration complete");
await sql.end();
