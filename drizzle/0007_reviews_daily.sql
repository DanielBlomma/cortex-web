CREATE TABLE IF NOT EXISTS "reviews_daily" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "total_count" integer DEFAULT 0 NOT NULL,
  "passed_count" integer DEFAULT 0 NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "error_count" integer DEFAULT 0 NOT NULL,
  "warning_count" integer DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_reviews_daily_org_date"
  ON "reviews_daily" ("org_id", "date");

CREATE INDEX IF NOT EXISTS "idx_reviews_daily_org"
  ON "reviews_daily" ("org_id");

INSERT INTO "reviews_daily" (
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
  "warning_count" = excluded."warning_count";
