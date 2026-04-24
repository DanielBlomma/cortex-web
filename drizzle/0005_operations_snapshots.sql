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
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_operations_snapshots_org"
  ON "operations_snapshots" ("org_id");

CREATE INDEX IF NOT EXISTS "idx_operations_snapshots_updated"
  ON "operations_snapshots" ("updated_at");

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
  "updated_at" = excluded."updated_at";
