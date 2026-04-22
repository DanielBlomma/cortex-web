import { sqlClient } from "@/db";

let ensured = false;
let inflight: Promise<void> | null = null;

const RUNTIME_SCHEMA_STATEMENTS = [
  `ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "environment" text DEFAULT 'production' NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_caller_lookups" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_trace_lookups" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_impact_analyses" integer DEFAULT 0 NOT NULL`,
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
  `CREATE INDEX IF NOT EXISTS "idx_audit_log_org_time" ON "audit_log" ("org_id", "occurred_at")`,
  `CREATE INDEX IF NOT EXISTS "idx_audit_log_resource" ON "audit_log" ("org_id", "resource_type", "resource_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_audit_log_session" ON "audit_log" ("org_id", "session_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_reviews_org_session" ON "reviews" ("org_id", "session_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_violations_org_session" ON "policy_violations" ("org_id", "session_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_workflow_snapshots_org_time" ON "workflow_snapshots" ("org_id", "received_at")`,
  `CREATE INDEX IF NOT EXISTS "idx_workflow_snapshots_org_session" ON "workflow_snapshots" ("org_id", "session_id")`,
  `UPDATE "policies" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`,
  `UPDATE "policies" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`,
  `UPDATE "policy_violations" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`,
  `UPDATE "policy_violations" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`,
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
