-- Rename predefined rule IDs to match cortex-enterprise validator registry.
-- Idempotent: safe to run multiple times; UPDATE is a no-op after first run.
-- See cortex-enterprise/packages/core/src/validators/builtins.ts for validator IDs.

UPDATE "policies" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis';--> statement-breakpoint
UPDATE "policies" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests';--> statement-breakpoint
UPDATE "policy_violations" SET "rule_id" = 'no-external-api-calls' WHERE "rule_id" = 'no-external-apis';--> statement-breakpoint
UPDATE "policy_violations" SET "rule_id" = 'require-test-coverage' WHERE "rule_id" = 'require-tests';
