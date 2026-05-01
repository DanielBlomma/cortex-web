import { sqlClient } from "@/db";

let ensured = false;
let inflight: Promise<void> | null = null;

const RUNTIME_SCHEMA_STATEMENTS = [
  `ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "environment" text DEFAULT 'production' NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_tool_calls" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_successful_tool_calls" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_failed_tool_calls" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_duration_ms" bigint DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_session_starts" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_session_ends" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_session_duration_ms" bigint DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_caller_lookups" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_trace_lookups" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_impact_analyses" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_tokens_total" bigint DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "caller_lookups" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "trace_lookups" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "impact_analyses" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "total_tool_calls" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "successful_tool_calls" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "failed_tool_calls" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "total_duration_ms" bigint DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "session_starts" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "session_ends" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "session_duration_ms_total" bigint DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "api_key_environment" text`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "instance_id" text`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "session_id" text`,
  `ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "tool_metrics" jsonb`,
  `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "title" text DEFAULT 'Untitled Policy' NOT NULL`,
  `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'custom' NOT NULL`,
  `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL`,
  `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "severity" text DEFAULT 'block' NOT NULL`,
  `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "type" text`,
  `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "config" jsonb`,
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "api_key_environment" text`,
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "instance_id" text`,
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "session_id" text`,
  `ALTER TABLE "policy_violations" ADD COLUMN IF NOT EXISTS "api_key_environment" text`,
  `ALTER TABLE "policy_violations" ADD COLUMN IF NOT EXISTS "instance_id" text`,
  `ALTER TABLE "policy_violations" ADD COLUMN IF NOT EXISTS "session_id" text`,
  `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "api_key_id" uuid REFERENCES "api_keys"("id") ON DELETE SET NULL`,
  `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "api_key_environment" text`,
  `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'web' NOT NULL`,
  `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "event_type" text`,
  `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "evidence_level" text DEFAULT 'diagnostic' NOT NULL`,
  `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "repo" text`,
  `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "instance_id" text`,
  `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "session_id" text`,
  `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "occurred_at" timestamptz DEFAULT now() NOT NULL`,
  `CREATE TABLE IF NOT EXISTS "operations_snapshots" (
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
  )`,
  `CREATE TABLE IF NOT EXISTS "violations_daily" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "date" date NOT NULL,
    "total_count" integer DEFAULT 0 NOT NULL,
    "error_count" integer DEFAULT 0 NOT NULL,
    "warning_count" integer DEFAULT 0 NOT NULL,
    "info_count" integer DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "reviews_daily" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "date" date NOT NULL,
    "total_count" integer DEFAULT 0 NOT NULL,
    "passed_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "error_count" integer DEFAULT 0 NOT NULL,
    "warning_count" integer DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "policy_rule_stats" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "rule_id" text NOT NULL,
    "review_failure_count" integer DEFAULT 0 NOT NULL,
    "warning_review_count" integer DEFAULT 0 NOT NULL,
    "last_review_at" timestamptz,
    "violation_count" integer DEFAULT 0 NOT NULL,
    "last_violation_at" timestamptz,
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "audit_daily" (
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
  )`,
  `CREATE TABLE IF NOT EXISTS "workflow_snapshots" (
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
  )`,
  `CREATE TABLE IF NOT EXISTS "workflow_sessions" (
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
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_audit_log_org_time" ON "audit_log" ("org_id", "occurred_at")`,
  `CREATE INDEX IF NOT EXISTS "idx_audit_log_resource" ON "audit_log" ("org_id", "resource_type", "resource_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_audit_log_session" ON "audit_log" ("org_id", "session_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_audit_daily_org_date" ON "audit_daily" ("org_id", "date")`,
  `CREATE INDEX IF NOT EXISTS "idx_audit_daily_org" ON "audit_daily" ("org_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_operations_snapshots_org" ON "operations_snapshots" ("org_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_operations_snapshots_updated" ON "operations_snapshots" ("updated_at")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_violations_daily_org_date" ON "violations_daily" ("org_id", "date")`,
  `CREATE INDEX IF NOT EXISTS "idx_violations_daily_org" ON "violations_daily" ("org_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_reviews_daily_org_date" ON "reviews_daily" ("org_id", "date")`,
  `CREATE INDEX IF NOT EXISTS "idx_reviews_daily_org" ON "reviews_daily" ("org_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_policy_rule_stats_org_rule" ON "policy_rule_stats" ("org_id", "rule_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_policy_rule_stats_org" ON "policy_rule_stats" ("org_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_reviews_org_session" ON "reviews" ("org_id", "session_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_violations_org_session" ON "policy_violations" ("org_id", "session_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_workflow_snapshots_org_time" ON "workflow_snapshots" ("org_id", "received_at")`,
  `CREATE INDEX IF NOT EXISTS "idx_workflow_snapshots_org_session" ON "workflow_snapshots" ("org_id", "session_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_workflow_sessions_org_session" ON "workflow_sessions" ("org_id", "session_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_workflow_sessions_org_time" ON "workflow_sessions" ("org_id", "last_received_at")`,
  `INSERT INTO "telemetry_daily" (
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
    "push_count" = excluded."push_count"`,
  `INSERT INTO "operations_snapshots" (
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
    "updated_at" = excluded."updated_at"`,
  `INSERT INTO "violations_daily" (
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
    "info_count" = excluded."info_count"`,
  `INSERT INTO "reviews_daily" (
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
    "warning_count" = excluded."warning_count"`,
  `INSERT INTO "policy_rule_stats" (
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
    "updated_at" = excluded."updated_at"`,
  `INSERT INTO "audit_daily" (
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
    "last_policy_sync_at" = excluded."last_policy_sync_at"`,
  `INSERT INTO "workflow_sessions" (
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
    "last_received_at" = excluded."last_received_at"`,
  `UPDATE "policies" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`,
  `UPDATE "policies" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`,
  `UPDATE "policy_violations" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`,
  `UPDATE "policy_violations" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`,
  // Phase 2 govern tables (PLAN.govern-mode.md). Idempotent CREATE IF NOT EXISTS.
  `CREATE TABLE IF NOT EXISTS "framework_bundle" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "framework_id" text NOT NULL,
    "version" text NOT NULL,
    "managed_settings" jsonb NOT NULL,
    "deny_rules" jsonb NOT NULL,
    "tamper_config" jsonb NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_framework_bundle_id_version" ON "framework_bundle" ("framework_id", "version")`,
  `CREATE INDEX IF NOT EXISTS "idx_framework_bundle_id" ON "framework_bundle" ("framework_id")`,
  `CREATE TABLE IF NOT EXISTS "govern_config_version" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "cli" text NOT NULL,
    "version" text NOT NULL,
    "frameworks" jsonb NOT NULL,
    "merged_config" jsonb NOT NULL,
    "generated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_govern_config_version" ON "govern_config_version" ("org_id", "cli", "version")`,
  `CREATE INDEX IF NOT EXISTS "idx_govern_config_org_time" ON "govern_config_version" ("org_id", "generated_at")`,
  `CREATE TABLE IF NOT EXISTS "host_enrollment" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "host_id" text NOT NULL,
    "os" text NOT NULL,
    "os_version" text,
    "ai_clis_detected" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "govern_mode" text NOT NULL DEFAULT 'off',
    "active_frameworks" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "config_version" text,
    "first_seen" timestamptz NOT NULL DEFAULT now(),
    "last_seen" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_host_enrollment_org_host" ON "host_enrollment" ("org_id", "host_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_host_enrollment_org_lastseen" ON "host_enrollment" ("org_id", "last_seen")`,
  `CREATE TABLE IF NOT EXISTS "managed_settings_audit" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "host_id" text NOT NULL,
    "instance_id" text,
    "cli" text NOT NULL,
    "version" text NOT NULL,
    "applied_at" timestamptz NOT NULL DEFAULT now(),
    "source" text NOT NULL,
    "success" boolean NOT NULL,
    "error_message" text
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_managed_settings_audit_org_time" ON "managed_settings_audit" ("org_id", "applied_at")`,
  `CREATE INDEX IF NOT EXISTS "idx_managed_settings_audit_host" ON "managed_settings_audit" ("host_id")`,
  `CREATE TABLE IF NOT EXISTS "hook_tamper_event" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "host_id" text NOT NULL,
    "cli" text NOT NULL,
    "hook_name" text NOT NULL,
    "last_seen" timestamptz,
    "detected_at" timestamptz NOT NULL DEFAULT now(),
    "resolved_at" timestamptz,
    "resolution_reason" text
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_hook_tamper_org_time" ON "hook_tamper_event" ("org_id", "detected_at")`,
  `CREATE INDEX IF NOT EXISTS "idx_hook_tamper_host" ON "hook_tamper_event" ("host_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_hook_tamper_unresolved" ON "hook_tamper_event" ("org_id", "resolved_at")`,
  `CREATE TABLE IF NOT EXISTS "ungoverned_session_event" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "host_id" text NOT NULL,
    "cli" text NOT NULL,
    "binary_path" text NOT NULL,
    "args" jsonb,
    "sys_user" text,
    "parent_pid" integer,
    "pid" integer,
    "detected_at" timestamptz NOT NULL DEFAULT now(),
    "action_taken" text NOT NULL DEFAULT 'logged'
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_ungoverned_org_time" ON "ungoverned_session_event" ("org_id", "detected_at")`,
  `CREATE INDEX IF NOT EXISTS "idx_ungoverned_host" ON "ungoverned_session_event" ("host_id")`,
] as const;

async function runRuntimeSchemaEnsure(): Promise<void> {
  for (const statement of RUNTIME_SCHEMA_STATEMENTS) {
    await sqlClient.unsafe(statement);
  }
}

export async function ensureRuntimeSchema(): Promise<void> {
  if (ensured) return;
  if (!inflight) {
    inflight = runRuntimeSchemaEnsure()
      .then(() => {
        ensured = true;
      })
      .catch((error) => {
        inflight = null;
        throw error;
      });
  }

  await inflight;
}
