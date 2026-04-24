CREATE TABLE IF NOT EXISTS "policy_rule_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "rule_id" text NOT NULL,
  "review_failure_count" integer DEFAULT 0 NOT NULL,
  "warning_review_count" integer DEFAULT 0 NOT NULL,
  "last_review_at" timestamptz,
  "violation_count" integer DEFAULT 0 NOT NULL,
  "last_violation_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_policy_rule_stats_org_rule"
  ON "policy_rule_stats" ("org_id", "rule_id");

CREATE INDEX IF NOT EXISTS "idx_policy_rule_stats_org"
  ON "policy_rule_stats" ("org_id");

INSERT INTO "policy_rule_stats" (
  "org_id",
  "rule_id",
  "review_failure_count",
  "warning_review_count",
  "last_review_at",
  "violation_count",
  "last_violation_at",
  "updated_at"
)
SELECT
  rules."org_id",
  rules."rule_id",
  coalesce(review_stats."review_failure_count", 0),
  coalesce(review_stats."warning_review_count", 0),
  review_stats."last_review_at",
  coalesce(violation_stats."violation_count", 0),
  violation_stats."last_violation_at",
  now()
FROM (
  SELECT DISTINCT "org_id", "policy_id" AS "rule_id" FROM "reviews"
  UNION
  SELECT DISTINCT "org_id", "rule_id" FROM "policy_violations"
) rules
LEFT JOIN (
  SELECT
    "org_id",
    "policy_id" AS "rule_id",
    count(*) FILTER (WHERE "pass" = false AND "severity" = 'error') AS "review_failure_count",
    count(*) FILTER (WHERE "pass" = false AND "severity" = 'warning') AS "warning_review_count",
    max("reviewed_at") AS "last_review_at"
  FROM "reviews"
  GROUP BY "org_id", "policy_id"
) review_stats ON review_stats."org_id" = rules."org_id" AND review_stats."rule_id" = rules."rule_id"
LEFT JOIN (
  SELECT
    "org_id",
    "rule_id",
    count(*) AS "violation_count",
    max("occurred_at") AS "last_violation_at"
  FROM "policy_violations"
  GROUP BY "org_id", "rule_id"
) violation_stats ON violation_stats."org_id" = rules."org_id" AND violation_stats."rule_id" = rules."rule_id"
ON CONFLICT ("org_id", "rule_id") DO UPDATE SET
  "review_failure_count" = excluded."review_failure_count",
  "warning_review_count" = excluded."warning_review_count",
  "last_review_at" = excluded."last_review_at",
  "violation_count" = excluded."violation_count",
  "last_violation_at" = excluded."last_violation_at",
  "updated_at" = excluded."updated_at";
