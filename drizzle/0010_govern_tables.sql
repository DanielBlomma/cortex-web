-- Phase 2 of PLAN.govern-mode.md: govern endpoint + framework bundles + host enrollment.
-- Idempotent — uses IF NOT EXISTS so re-running is safe (matches existing migrations).

CREATE TABLE IF NOT EXISTS "framework_bundle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "framework_id" text NOT NULL,
  "version" text NOT NULL,
  "managed_settings" jsonb NOT NULL,
  "deny_rules" jsonb NOT NULL,
  "tamper_config" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_framework_bundle_id_version"
  ON "framework_bundle" ("framework_id", "version");

CREATE INDEX IF NOT EXISTS "idx_framework_bundle_id"
  ON "framework_bundle" ("framework_id");

CREATE TABLE IF NOT EXISTS "govern_config_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "cli" text NOT NULL,
  "version" text NOT NULL,
  "frameworks" jsonb NOT NULL,
  "merged_config" jsonb NOT NULL,
  "generated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_govern_config_version"
  ON "govern_config_version" ("org_id", "cli", "version");

CREATE INDEX IF NOT EXISTS "idx_govern_config_org_time"
  ON "govern_config_version" ("org_id", "generated_at");

CREATE TABLE IF NOT EXISTS "host_enrollment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "host_id" text NOT NULL,
  "os" text NOT NULL,
  "os_version" text,
  "ai_clis_detected" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "govern_mode" text NOT NULL DEFAULT 'off',
  "active_frameworks" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "config_version" text,
  "first_seen" timestamptz NOT NULL DEFAULT now(),
  "last_seen" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_host_enrollment_org_host"
  ON "host_enrollment" ("org_id", "host_id");

CREATE INDEX IF NOT EXISTS "idx_host_enrollment_org_lastseen"
  ON "host_enrollment" ("org_id", "last_seen");

CREATE TABLE IF NOT EXISTS "managed_settings_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "host_id" text NOT NULL,
  "instance_id" text,
  "cli" text NOT NULL,
  "version" text NOT NULL,
  "applied_at" timestamptz NOT NULL DEFAULT now(),
  "source" text NOT NULL,
  "success" boolean NOT NULL,
  "error_message" text
);

CREATE INDEX IF NOT EXISTS "idx_managed_settings_audit_org_time"
  ON "managed_settings_audit" ("org_id", "applied_at");

CREATE INDEX IF NOT EXISTS "idx_managed_settings_audit_host"
  ON "managed_settings_audit" ("host_id");

CREATE TABLE IF NOT EXISTS "hook_tamper_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "host_id" text NOT NULL,
  "cli" text NOT NULL,
  "hook_name" text NOT NULL,
  "last_seen" timestamptz,
  "detected_at" timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz,
  "resolution_reason" text
);

CREATE INDEX IF NOT EXISTS "idx_hook_tamper_org_time"
  ON "hook_tamper_event" ("org_id", "detected_at");

CREATE INDEX IF NOT EXISTS "idx_hook_tamper_host"
  ON "hook_tamper_event" ("host_id");

CREATE INDEX IF NOT EXISTS "idx_hook_tamper_unresolved"
  ON "hook_tamper_event" ("org_id", "resolved_at");

CREATE TABLE IF NOT EXISTS "ungoverned_session_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "host_id" text NOT NULL,
  "cli" text NOT NULL,
  "binary_path" text NOT NULL,
  "args" jsonb,
  "sys_user" text,
  "parent_pid" integer,
  "pid" integer,
  "detected_at" timestamptz NOT NULL DEFAULT now(),
  "action_taken" text NOT NULL DEFAULT 'logged'
);

CREATE INDEX IF NOT EXISTS "idx_ungoverned_org_time"
  ON "ungoverned_session_event" ("org_id", "detected_at");

CREATE INDEX IF NOT EXISTS "idx_ungoverned_host"
  ON "ungoverned_session_event" ("host_id");
