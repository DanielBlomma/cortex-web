CREATE TABLE IF NOT EXISTS "violations_daily" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "total_count" integer DEFAULT 0 NOT NULL,
  "error_count" integer DEFAULT 0 NOT NULL,
  "warning_count" integer DEFAULT 0 NOT NULL,
  "info_count" integer DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_violations_daily_org_date"
  ON "violations_daily" ("org_id", "date");

CREATE INDEX IF NOT EXISTS "idx_violations_daily_org"
  ON "violations_daily" ("org_id");

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
  "info_count" = excluded."info_count";
