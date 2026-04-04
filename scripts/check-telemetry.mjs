import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

const [totals] = await sql`
  SELECT
    count(*) as event_count,
    coalesce(sum(searches), 0) as searches,
    coalesce(sum(estimated_tokens_saved), 0) as saved,
    coalesce(sum(total_results_returned), 0) as results,
    coalesce(sum(estimated_tokens_total), 0) as total_col,
    min(period_start)::text as first_period,
    max(period_start)::text as last_period
  FROM telemetry_events
`;
console.log('=== TOTALS ===');
console.log(JSON.stringify(totals, null, 2));

const daily = await sql`
  SELECT
    date(period_start at time zone 'UTC') as d,
    count(*) as pushes,
    sum(searches) as searches,
    sum(estimated_tokens_saved) as saved,
    sum(total_results_returned) as results
  FROM telemetry_events
  GROUP BY 1 ORDER BY 1
`;
console.log('\n=== DAILY ===');
for (const r of daily) console.log(JSON.stringify(r));

const orgs = await sql`SELECT DISTINCT org_id FROM telemetry_events`;
console.log('\n=== ORGS ===');
for (const r of orgs) console.log(r.org_id);

await sql.end();
