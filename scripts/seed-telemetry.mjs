import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

// Get the org_id and api_key_id from existing data
const [existing] = await sql`SELECT org_id, api_key_id FROM telemetry_events LIMIT 1`;
if (!existing) {
  console.log('No existing telemetry events found. Push at least one event first.');
  await sql.end();
  process.exit(1);
}

const orgId = existing.org_id;
const apiKeyId = existing.api_key_id;
console.log(`Seeding telemetry for org: ${orgId}`);

// Generate 14 days of sample data
const rows = [];
for (let daysAgo = 13; daysAgo >= 1; daysAgo--) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(10, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(18, 0, 0, 0);

  const searches = 8 + Math.floor(Math.random() * 25);
  const relatedLookups = Math.floor(searches * 0.6 + Math.random() * 5);
  const ruleLookups = Math.floor(searches * 0.3 + Math.random() * 3);
  const reloads = Math.floor(Math.random() * 4);
  const totalResults = Math.floor(searches * 2.5 + Math.random() * 10);
  const tokensSaved = Math.floor(searches * 800 + Math.random() * 2000);

  rows.push({
    org_id: orgId,
    api_key_id: apiKeyId,
    period_start: date.toISOString(),
    period_end: endDate.toISOString(),
    searches,
    related_lookups: relatedLookups,
    rule_lookups: ruleLookups,
    reloads,
    total_results_returned: totalResults,
    estimated_tokens_saved: tokensSaved,
    estimated_tokens_total: 0,
  });
}

await sql`INSERT INTO telemetry_events ${sql(rows)}`;
console.log(`Inserted ${rows.length} telemetry events`);

// Also seed some violations
const rules = ['no-secrets-in-code', 'require-code-review', 'no-env-in-prompts', 'max-file-size'];
const severities = ['error', 'warning', 'warning', 'info'];
const messages = [
  'Hardcoded API key detected in generated code',
  'AI-generated changes pushed without review',
  'Environment variable DATABASE_URL found in prompt context',
  'Generated file exceeds 500-line limit',
];

const violations = [];
for (let daysAgo = 10; daysAgo >= 0; daysAgo--) {
  const count = Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * rules.length);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

    violations.push({
      org_id: orgId,
      api_key_id: apiKeyId,
      rule_id: rules[idx],
      severity: severities[idx],
      message: messages[idx],
      file_path: `src/${['utils', 'lib', 'components', 'api'][Math.floor(Math.random() * 4)]}/${['auth', 'db', 'config', 'handler'][Math.floor(Math.random() * 4)]}.ts`,
      occurred_at: date.toISOString(),
    });
  }
}

if (violations.length > 0) {
  await sql`INSERT INTO policy_violations ${sql(violations)}`;
  console.log(`Inserted ${violations.length} violations`);
} else {
  console.log('No violations generated (random)');
}

await sql.end();
