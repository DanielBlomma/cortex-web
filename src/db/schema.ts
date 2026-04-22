import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uuid,
  bigint,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    plan: text("plan").notNull().default("free"),
    maxRepos: integer("max_repos").notNull().default(3),
    maxApiKeys: integer("max_api_keys").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_organizations_slug").on(t.slug),
    uniqueIndex("idx_organizations_stripe").on(t.stripeCustomerId),
  ]
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("idx_users_email").on(t.email)]
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("developer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_memberships_org_user").on(t.orgId, t.userId),
    index("idx_memberships_org").on(t.orgId),
    index("idx_memberships_user").on(t.userId),
  ]
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Default"),
    environment: text("environment").notNull().default("production"),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    rawKey: text("raw_key"),
    hmacSecret: text("hmac_secret"),
    scopes: text("scopes").array().notNull().default(["telemetry", "policy"]),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_api_keys_org").on(t.orgId),
    index("idx_api_keys_org_env").on(t.orgId, t.environment),
    index("idx_api_keys_hash").on(t.keyHash),
  ]
);

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customer: text("customer").notNull(),
    edition: text("edition").notNull().default("connected"),
    issuedAt: date("issued_at").notNull().defaultNow(),
    expiresAt: date("expires_at").notNull(),
    maxRepos: integer("max_repos").notNull().default(10),
    features: text("features").array().notNull().default([]),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_licenses_org").on(t.orgId),
    index("idx_licenses_status").on(t.orgId, t.status),
  ]
);

export const telemetryEvents = pgTable(
  "telemetry_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
      onDelete: "set null",
    }),
    apiKeyEnvironment: text("api_key_environment"),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    totalToolCalls: integer("total_tool_calls").notNull().default(0),
    successfulToolCalls: integer("successful_tool_calls").notNull().default(0),
    failedToolCalls: integer("failed_tool_calls").notNull().default(0),
    totalDurationMs: bigint("total_duration_ms", { mode: "number" })
      .notNull()
      .default(0),
    sessionStarts: integer("session_starts").notNull().default(0),
    sessionEnds: integer("session_ends").notNull().default(0),
    sessionDurationMsTotal: bigint("session_duration_ms_total", {
      mode: "number",
    })
      .notNull()
      .default(0),
    searches: integer("searches").notNull().default(0),
    relatedLookups: integer("related_lookups").notNull().default(0),
    ruleLookups: integer("rule_lookups").notNull().default(0),
    reloads: integer("reloads").notNull().default(0),
    callerLookups: integer("caller_lookups").notNull().default(0),
    traceLookups: integer("trace_lookups").notNull().default(0),
    impactAnalyses: integer("impact_analyses").notNull().default(0),
    totalResultsReturned: integer("total_results_returned")
      .notNull()
      .default(0),
    estimatedTokensSaved: integer("estimated_tokens_saved")
      .notNull()
      .default(0),
    estimatedTokensTotal: integer("estimated_tokens_total")
      .notNull()
      .default(0),
    clientVersion: text("client_version"),
    instanceId: text("instance_id"),
    sessionId: text("session_id"),
    toolMetrics: jsonb("tool_metrics"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_telemetry_org_time").on(t.orgId, t.periodStart),
    index("idx_telemetry_instance").on(t.orgId, t.instanceId),
    index("idx_telemetry_session").on(t.orgId, t.sessionId),
  ]
);

export const telemetryDaily = pgTable(
  "telemetry_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    totalSearches: integer("total_searches").notNull().default(0),
    totalRelatedLookups: integer("total_related_lookups").notNull().default(0),
    totalRuleLookups: integer("total_rule_lookups").notNull().default(0),
    totalReloads: integer("total_reloads").notNull().default(0),
    totalCallerLookups: integer("total_caller_lookups").notNull().default(0),
    totalTraceLookups: integer("total_trace_lookups").notNull().default(0),
    totalImpactAnalyses: integer("total_impact_analyses").notNull().default(0),
    totalResultsReturned: integer("total_results_returned")
      .notNull()
      .default(0),
    totalTokensSaved: bigint("total_tokens_saved", { mode: "number" })
      .notNull()
      .default(0),
    pushCount: integer("push_count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("idx_telemetry_daily_org_date").on(t.orgId, t.date),
    index("idx_telemetry_daily_org").on(t.orgId),
  ]
);

export const policies = pgTable(
  "policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled Policy"),
    ruleId: text("rule_id").notNull(),
    kind: text("kind").notNull().default("custom"),
    status: text("status").notNull().default("active"),
    severity: text("severity").notNull().default("block"),
    description: text("description").notNull().default(""),
    priority: integer("priority").notNull().default(50),
    scope: text("scope").notNull().default("global"),
    enforce: boolean("enforce").notNull().default(true),
    // Type + config carry execution hints for generic evaluators in
    // cortex-enterprise. Nullable: predefined rules (name-based registry)
    // and legacy policies leave these null. Custom rules must populate both.
    type: text("type"),
    config: jsonb("config"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_policies_org_rule").on(t.orgId, t.ruleId),
    index("idx_policies_org").on(t.orgId),
    index("idx_policies_org_status").on(t.orgId, t.status),
  ]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
      onDelete: "set null",
    }),
    apiKeyEnvironment: text("api_key_environment"),
    source: text("source").notNull().default("web"),
    action: text("action").notNull(),
    eventType: text("event_type"),
    evidenceLevel: text("evidence_level").notNull().default("diagnostic"),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    repo: text("repo"),
    instanceId: text("instance_id"),
    sessionId: text("session_id"),
    description: text("description").notNull().default(""),
    metadata: text("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_audit_log_org_time").on(t.orgId, t.occurredAt),
    index("idx_audit_log_resource").on(t.orgId, t.resourceType, t.resourceId),
    index("idx_audit_log_session").on(t.orgId, t.sessionId),
  ]
);

export const policyViolations = pgTable(
  "policy_violations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
      onDelete: "set null",
    }),
    apiKeyEnvironment: text("api_key_environment"),
    repo: text("repo"),
    instanceId: text("instance_id"),
    sessionId: text("session_id"),
    ruleId: text("rule_id").notNull(),
    severity: text("severity").notNull().default("warning"),
    message: text("message").notNull().default(""),
    filePath: text("file_path"),
    metadata: text("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_violations_org_time").on(t.orgId, t.occurredAt),
    index("idx_violations_org_rule").on(t.orgId, t.ruleId),
    index("idx_violations_org_session").on(t.orgId, t.sessionId),
  ]
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
      onDelete: "set null",
    }),
    apiKeyEnvironment: text("api_key_environment"),
    repo: text("repo"),
    instanceId: text("instance_id"),
    sessionId: text("session_id"),
    policyId: text("policy_id").notNull(),
    pass: boolean("pass").notNull(),
    severity: text("severity").notNull().default("info"),
    message: text("message").notNull().default(""),
    detail: text("detail"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_reviews_org_time").on(t.orgId, t.reviewedAt),
    index("idx_reviews_org_policy").on(t.orgId, t.policyId),
    index("idx_reviews_org_session").on(t.orgId, t.sessionId),
  ]
);

export const workflowSnapshots = pgTable(
  "workflow_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
      onDelete: "set null",
    }),
    apiKeyEnvironment: text("api_key_environment"),
    repo: text("repo"),
    instanceId: text("instance_id"),
    sessionId: text("session_id"),
    phase: text("phase").notNull(),
    approvalStatus: text("approval_status").notNull(),
    planStatus: text("plan_status").notNull(),
    reviewStatus: text("review_status").notNull(),
    blockedReasons: jsonb("blocked_reasons"),
    snapshot: jsonb("snapshot").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_workflow_snapshots_org_time").on(t.orgId, t.receivedAt),
    index("idx_workflow_snapshots_org_session").on(t.orgId, t.sessionId),
  ]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    stripePriceId: text("stripe_price_id").notNull(),
    status: text("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
    }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_subscriptions_org").on(t.orgId)]
);
