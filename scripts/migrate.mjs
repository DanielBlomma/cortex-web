import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// Idempotent data migrations. Safe to run multiple times — all statements
// are no-ops after first successful run.

// Historical: ensure telemetry columns exist (predates drizzle-kit push in build).
await sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "environment" text DEFAULT 'production' NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_caller_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_trace_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_impact_analyses" integer DEFAULT 0 NOT NULL`;
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
await sql`CREATE INDEX IF NOT EXISTS "idx_audit_log_org_time" ON "audit_log" ("org_id", "occurred_at")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_audit_log_resource" ON "audit_log" ("org_id", "resource_type", "resource_id")`;
await sql`CREATE INDEX IF NOT EXISTS "idx_audit_log_session" ON "audit_log" ("org_id", "session_id")`;

// Rename predefined rule IDs to match cortex-enterprise validator registry.
// See cortex-enterprise/packages/core/src/validators/builtins.ts.
await sql`UPDATE "policies" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`;
await sql`UPDATE "policies" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`;
await sql`UPDATE "policy_violations" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`;
await sql`UPDATE "policy_violations" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`;

console.log("Migration complete");
await sql.end();
