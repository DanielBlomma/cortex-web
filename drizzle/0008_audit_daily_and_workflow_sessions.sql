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
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_audit_daily_org_date"
  ON "audit_daily" ("org_id", "date");

CREATE INDEX IF NOT EXISTS "idx_audit_daily_org"
  ON "audit_daily" ("org_id");

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
  "last_policy_sync_at" = excluded."last_policy_sync_at";

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
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_workflow_sessions_org_session"
  ON "workflow_sessions" ("org_id", "session_id");

CREATE INDEX IF NOT EXISTS "idx_workflow_sessions_org_time"
  ON "workflow_sessions" ("org_id", "last_received_at");

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
  "last_received_at" = excluded."last_received_at";
