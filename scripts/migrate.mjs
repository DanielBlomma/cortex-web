import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

await sql`
  ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_caller_lookups" integer DEFAULT 0 NOT NULL;
`;
await sql`
  ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_trace_lookups" integer DEFAULT 0 NOT NULL;
`;
await sql`
  ALTER TABLE "telemetry_daily" ADD COLUMN IF NOT EXISTS "total_impact_analyses" integer DEFAULT 0 NOT NULL;
`;
await sql`
  ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "caller_lookups" integer DEFAULT 0 NOT NULL;
`;
await sql`
  ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "trace_lookups" integer DEFAULT 0 NOT NULL;
`;
await sql`
  ALTER TABLE "telemetry_events" ADD COLUMN IF NOT EXISTS "impact_analyses" integer DEFAULT 0 NOT NULL;
`;

console.log("Migration complete");
await sql.end();
