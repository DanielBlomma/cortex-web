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
    totalToolCalls: integer("total_tool_calls").notNull().default(0),
    totalSuccessfulToolCalls: integer("total_successful_tool_calls")
      .notNull()
      .default(0),
    totalFailedToolCalls: integer("total_failed_tool_calls")
      .notNull()
      .default(0),
    totalDurationMs: bigint("total_duration_ms", { mode: "number" })
      .notNull()
      .default(0),
    totalSessionStarts: integer("total_session_starts").notNull().default(0),
    totalSessionEnds: integer("total_session_ends").notNull().default(0),
    totalSessionDurationMs: bigint("total_session_duration_ms", {
      mode: "number",
    })
      .notNull()
      .default(0),
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
    totalTokensTotal: bigint("total_tokens_total", { mode: "number" })
      .notNull()
      .default(0),
    pushCount: integer("push_count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("idx_telemetry_daily_org_date").on(t.orgId, t.date),
    index("idx_telemetry_daily_org").on(t.orgId),
  ]
);

export const operationsSnapshots = pgTable(
  "operations_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    activeApiKeys: integer("active_api_keys").notNull().default(0),
    activePolicies: integer("active_policies").notNull().default(0),
    enforcedPolicies: integer("enforced_policies").notNull().default(0),
    blockingPolicies: integer("blocking_policies").notNull().default(0),
    activeInstances: integer("active_instances").notNull().default(0),
    distinctVersions: integer("distinct_versions").notNull().default(0),
    totalToolCalls: bigint("total_tool_calls", { mode: "number" })
      .notNull()
      .default(0),
    failedToolCalls: bigint("failed_tool_calls", { mode: "number" })
      .notNull()
      .default(0),
    workflowSessions30d: integer("workflow_sessions_30d").notNull().default(0),
    reviewedSessions30d: integer("reviewed_sessions_30d").notNull().default(0),
    approvedSessions30d: integer("approved_sessions_30d").notNull().default(0),
    blockedSessions30d: integer("blocked_sessions_30d").notNull().default(0),
    requiredAuditEvents30d: integer("required_audit_events_30d")
      .notNull()
      .default(0),
    lastPolicySyncAt: timestamp("last_policy_sync_at", { withTimezone: true }),
    lastTelemetryAt: timestamp("last_telemetry_at", { withTimezone: true }),
    lastAuditAt: timestamp("last_audit_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_operations_snapshots_org").on(t.orgId),
    index("idx_operations_snapshots_updated").on(t.updatedAt),
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

export const auditDaily = pgTable(
  "audit_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    totalCount: integer("total_count").notNull().default(0),
    requiredCount: integer("required_count").notNull().default(0),
    diagnosticCount: integer("diagnostic_count").notNull().default(0),
    clientCount: integer("client_count").notNull().default(0),
    webCount: integer("web_count").notNull().default(0),
    lastOccurredAt: timestamp("last_occurred_at", { withTimezone: true }),
    lastPolicySyncAt: timestamp("last_policy_sync_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("idx_audit_daily_org_date").on(t.orgId, t.date),
    index("idx_audit_daily_org").on(t.orgId),
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

export const violationsDaily = pgTable(
  "violations_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    totalCount: integer("total_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    infoCount: integer("info_count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("idx_violations_daily_org_date").on(t.orgId, t.date),
    index("idx_violations_daily_org").on(t.orgId),
  ]
);

export const reviewsDaily = pgTable(
  "reviews_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    totalCount: integer("total_count").notNull().default(0),
    passedCount: integer("passed_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("idx_reviews_daily_org_date").on(t.orgId, t.date),
    index("idx_reviews_daily_org").on(t.orgId),
  ]
);

export const policyRuleStats = pgTable(
  "policy_rule_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ruleId: text("rule_id").notNull(),
    reviewFailureCount: integer("review_failure_count").notNull().default(0),
    warningReviewCount: integer("warning_review_count").notNull().default(0),
    lastReviewAt: timestamp("last_review_at", { withTimezone: true }),
    violationCount: integer("violation_count").notNull().default(0),
    lastViolationAt: timestamp("last_violation_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_policy_rule_stats_org_rule").on(t.orgId, t.ruleId),
    index("idx_policy_rule_stats_org").on(t.orgId),
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

export const workflowSessions = pgTable(
  "workflow_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    repo: text("repo"),
    instanceId: text("instance_id"),
    phase: text("phase").notNull(),
    approvalStatus: text("approval_status").notNull(),
    planStatus: text("plan_status").notNull(),
    reviewStatus: text("review_status").notNull(),
    blockedReasons: jsonb("blocked_reasons"),
    lastReceivedAt: timestamp("last_received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_workflow_sessions_org_session").on(t.orgId, t.sessionId),
    index("idx_workflow_sessions_org_time").on(t.orgId, t.lastReceivedAt),
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

// ── Govern (Phase 2 of PLAN.govern-mode.md) ─────────────────────────

export const frameworkBundle = pgTable(
  "framework_bundle",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    frameworkId: text("framework_id").notNull(),
    version: text("version").notNull(),
    managedSettings: jsonb("managed_settings").notNull(),
    denyRules: jsonb("deny_rules").notNull(),
    tamperConfig: jsonb("tamper_config").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_framework_bundle_id_version").on(t.frameworkId, t.version),
    index("idx_framework_bundle_id").on(t.frameworkId),
  ]
);

export const governConfigVersion = pgTable(
  "govern_config_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    cli: text("cli").notNull(),
    version: text("version").notNull(),
    frameworks: jsonb("frameworks").notNull(),
    mergedConfig: jsonb("merged_config").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_govern_config_version").on(t.orgId, t.cli, t.version),
    index("idx_govern_config_org_time").on(t.orgId, t.generatedAt),
  ]
);

export const hostEnrollment = pgTable(
  "host_enrollment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    hostId: text("host_id").notNull(),
    os: text("os").notNull(),
    osVersion: text("os_version"),
    aiClisDetected: jsonb("ai_clis_detected").notNull().default([]),
    governMode: text("govern_mode").notNull().default("off"),
    activeFrameworks: jsonb("active_frameworks").notNull().default([]),
    configVersion: text("config_version"),
    firstSeen: timestamp("first_seen", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_host_enrollment_org_host").on(t.orgId, t.hostId),
    index("idx_host_enrollment_org_lastseen").on(t.orgId, t.lastSeen),
  ]
);

export const managedSettingsAudit = pgTable(
  "managed_settings_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    hostId: text("host_id").notNull(),
    instanceId: text("instance_id"),
    cli: text("cli").notNull(),
    version: text("version").notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    source: text("source").notNull(),
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
  },
  (t) => [
    index("idx_managed_settings_audit_org_time").on(t.orgId, t.appliedAt),
    index("idx_managed_settings_audit_host").on(t.hostId),
  ]
);

export const hookTamperEvent = pgTable(
  "hook_tamper_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    hostId: text("host_id").notNull(),
    cli: text("cli").notNull(),
    hookName: text("hook_name").notNull(),
    lastSeen: timestamp("last_seen", { withTimezone: true }),
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionReason: text("resolution_reason"),
  },
  (t) => [
    index("idx_hook_tamper_org_time").on(t.orgId, t.detectedAt),
    index("idx_hook_tamper_host").on(t.hostId),
    index("idx_hook_tamper_unresolved").on(t.orgId, t.resolvedAt),
  ]
);

export const ungovernedSessionEvent = pgTable(
  "ungoverned_session_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    hostId: text("host_id").notNull(),
    cli: text("cli").notNull(),
    binaryPath: text("binary_path").notNull(),
    args: jsonb("args"),
    sysUser: text("sys_user"),
    parentPid: integer("parent_pid"),
    pid: integer("pid"),
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    actionTaken: text("action_taken").notNull().default("logged"),
  },
  (t) => [
    index("idx_ungoverned_org_time").on(t.orgId, t.detectedAt),
    index("idx_ungoverned_host").on(t.hostId),
  ]
);
