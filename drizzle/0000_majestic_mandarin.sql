CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text DEFAULT 'Default' NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"raw_key" text,
	"hmac_secret" text,
	"scopes" text[] DEFAULT '{"telemetry","policy"}' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"description" text DEFAULT '' NOT NULL,
	"metadata" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"customer" text NOT NULL,
	"edition" text DEFAULT 'connected' NOT NULL,
	"issued_at" date DEFAULT now() NOT NULL,
	"expires_at" date NOT NULL,
	"max_repos" integer DEFAULT 10 NOT NULL,
	"features" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'developer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"stripe_customer_id" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"max_repos" integer DEFAULT 3 NOT NULL,
	"max_api_keys" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"scope" text DEFAULT 'global' NOT NULL,
	"enforce" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"api_key_id" uuid,
	"repo" text,
	"rule_id" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"file_path" text,
	"metadata" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"date" date NOT NULL,
	"total_searches" integer DEFAULT 0 NOT NULL,
	"total_related_lookups" integer DEFAULT 0 NOT NULL,
	"total_rule_lookups" integer DEFAULT 0 NOT NULL,
	"total_reloads" integer DEFAULT 0 NOT NULL,
	"total_results_returned" integer DEFAULT 0 NOT NULL,
	"total_tokens_saved" bigint DEFAULT 0 NOT NULL,
	"push_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"api_key_id" uuid,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"searches" integer DEFAULT 0 NOT NULL,
	"related_lookups" integer DEFAULT 0 NOT NULL,
	"rule_lookups" integer DEFAULT 0 NOT NULL,
	"reloads" integer DEFAULT 0 NOT NULL,
	"total_results_returned" integer DEFAULT 0 NOT NULL,
	"estimated_tokens_saved" integer DEFAULT 0 NOT NULL,
	"estimated_tokens_total" integer DEFAULT 0 NOT NULL,
	"client_version" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_violations" ADD CONSTRAINT "policy_violations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_violations" ADD CONSTRAINT "policy_violations_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_daily" ADD CONSTRAINT "telemetry_daily_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_keys_org" ON "api_keys" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_audit_log_org_time" ON "audit_log" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_resource" ON "audit_log" USING btree ("org_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_licenses_org" ON "licenses" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_licenses_status" ON "licenses" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memberships_org_user" ON "memberships" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_memberships_org" ON "memberships" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_memberships_user" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organizations_slug" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organizations_stripe" ON "organizations" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_policies_org_rule" ON "policies" USING btree ("org_id","rule_id");--> statement-breakpoint
CREATE INDEX "idx_policies_org" ON "policies" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_violations_org_time" ON "policy_violations" USING btree ("org_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_violations_org_rule" ON "policy_violations" USING btree ("org_id","rule_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_org" ON "subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_telemetry_daily_org_date" ON "telemetry_daily" USING btree ("org_id","date");--> statement-breakpoint
CREATE INDEX "idx_telemetry_daily_org" ON "telemetry_daily" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_telemetry_org_time" ON "telemetry_events" USING btree ("org_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");