import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// Idempotent data migrations. Safe to run multiple times — all statements
// are no-ops after first successful run.

// Historical: ensure telemetry columns exist (predates drizzle-kit push in build).
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_caller_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_trace_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_impact_analyses" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "caller_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "trace_lookups" integer DEFAULT 0 NOT NULL`;
await sql`ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "impact_analyses" integer DEFAULT 0 NOT NULL`;

// Rename predefined rule IDs to match cortex-enterprise validator registry.
// See cortex-enterprise/packages/core/src/validators/builtins.ts.
await sql`UPDATE "policies" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`;
await sql`UPDATE "policies" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`;
await sql`UPDATE "policy_violations" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis'`;
await sql`UPDATE "policy_violations" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests'`;

console.log("Migration complete");
await sql.end();
