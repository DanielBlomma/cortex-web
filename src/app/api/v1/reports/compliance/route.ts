import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  apiKeys,
  auditDaily,
  auditLog,
  policyViolations,
  policies,
  reviewsDaily,
  telemetryEvents,
  telemetryDaily,
  violationsDaily,
  workflowSnapshots,
} from "@/db/schema";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import { getOwnerId } from "@/lib/auth/owner";
import { logAudit } from "@/lib/audit/log";
import { AUDIT_RETENTION_POLICY } from "@/lib/audit/retention";
import { TELEMETRY_RETENTION_POLICY } from "@/lib/telemetry/retention";
import {
  buildControlMatrix,
} from "@/lib/compliance/control-mapping";
import { buildComplianceReportContract } from "@/lib/compliance/report-contract";
import { buildRegulatoryPackPreview } from "@/lib/compliance/regulatory-pack-preview";
import { summarizeAuditEvidence } from "@/lib/compliance/audit-evidence";
import { applyRateLimit } from "@/lib/rate-limit";
import { createRequestTiming } from "@/lib/perf/request-timing";

export async function GET(req: Request) {
  const timing = createRequestTiming();
  const rl = applyRateLimit(req, 5);
  if (rl) return rl;

  const owner = await timing.timeStep("resolve_owner", () => getOwnerId());
  if (!owner)
    return timing.attach(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return timing.attach(
      NextResponse.json(
        { error: "from and to query parameters are required (YYYY-MM-DD)" },
        { status: 400 }
      ),
    );
  }

  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T23:59:59Z`);
  const fromDay = from;
  const toDay = to;

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return timing.attach(
      NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      ),
    );
  }

  const ownerId = owner.ownerId;

  // 1. Policy governance
  const activePolicies = await timing.timeStep("compliance_policies", () =>
    db
    .select({
      id: policies.id,
      title: policies.title,
      ruleId: policies.ruleId,
      kind: policies.kind,
      status: policies.status,
      severity: policies.severity,
      description: policies.description,
      priority: policies.priority,
      scope: policies.scope,
      enforce: policies.enforce,
      createdAt: policies.createdAt,
      updatedAt: policies.updatedAt,
    })
    .from(policies)
    .where(eq(policies.orgId, ownerId))
    .orderBy(policies.priority),
  );

  // 2. API key inventory
  const allKeys = await timing.timeStep("compliance_api_keys", () =>
    db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.orgId, ownerId))
    .orderBy(apiKeys.createdAt),
  );

  const activeKeys = allKeys.filter((k) => !k.revokedAt);
  const revokedKeysInPeriod = allKeys.filter(
    (k) => k.revokedAt && k.revokedAt >= fromDate && k.revokedAt <= toDate
  );

  // 3. Violations in period
  const [violationTotals] = await timing.timeStep("compliance_violation_totals", () =>
    db
    .select({
      total: sql<number>`coalesce(sum(${violationsDaily.totalCount}), 0)`,
      errors: sql<number>`coalesce(sum(${violationsDaily.errorCount}), 0)`,
      warnings: sql<number>`coalesce(sum(${violationsDaily.warningCount}), 0)`,
      info: sql<number>`coalesce(sum(${violationsDaily.infoCount}), 0)`,
    })
    .from(violationsDaily)
    .where(
      and(
        eq(violationsDaily.orgId, ownerId),
        gte(violationsDaily.date, fromDay),
        lte(violationsDaily.date, toDay)
      )
    ),
  );

  const violationsByRule = await timing.timeStep("compliance_violations_by_rule", () =>
    db
    .select({
      ruleId: policyViolations.ruleId,
      ruleTitle: policies.title,
      policySeverity: policies.severity,
      count: sql<number>`count(*)`,
      errors: sql<number>`count(*) filter (where ${policyViolations.severity} = 'error')`,
      warnings: sql<number>`count(*) filter (where ${policyViolations.severity} = 'warning')`,
    })
    .from(policyViolations)
    .leftJoin(
      policies,
      and(eq(policies.orgId, ownerId), eq(policies.ruleId, policyViolations.ruleId))
    )
    .where(
      and(
        eq(policyViolations.orgId, ownerId),
        gte(policyViolations.occurredAt, fromDate),
        lte(policyViolations.occurredAt, toDate)
      )
    )
    .groupBy(policyViolations.ruleId, policies.title, policies.severity)
    .orderBy(desc(sql`count(*)`)),
  );

  // 4. Telemetry summary for period
  const [telemetry] = await timing.timeStep("compliance_telemetry_totals", () =>
    db
    .select({
      toolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalToolCalls}), 0)`,
      successfulToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalSuccessfulToolCalls}), 0)`,
      failedToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalFailedToolCalls}), 0)`,
      totalDurationMs: sql<number>`coalesce(sum(${telemetryDaily.totalDurationMs}), 0)`,
      sessionStarts: sql<number>`coalesce(sum(${telemetryDaily.totalSessionStarts}), 0)`,
      sessionEnds: sql<number>`coalesce(sum(${telemetryDaily.totalSessionEnds}), 0)`,
      searches: sql<number>`coalesce(sum(${telemetryDaily.totalSearches}), 0)`,
      tokensSaved: sql<number>`coalesce(sum(${telemetryDaily.totalTokensSaved}), 0)`,
      resultsReturned: sql<number>`coalesce(sum(${telemetryDaily.totalResultsReturned}), 0)`,
      pushCount: sql<number>`coalesce(sum(${telemetryDaily.pushCount}), 0)`,
    })
    .from(telemetryDaily)
    .where(
      and(
        eq(telemetryDaily.orgId, ownerId),
        gte(telemetryDaily.date, fromDay),
        lte(telemetryDaily.date, toDay)
      )
    ),
  );

  const [telemetryInstances] = await timing.timeStep("compliance_telemetry_instances", () =>
    db
    .select({
      distinctInstances: sql<number>`count(distinct coalesce(${telemetryEvents.instanceId}, ${telemetryEvents.apiKeyId}::text))`,
    })
    .from(telemetryEvents)
    .where(
      and(
        eq(telemetryEvents.orgId, ownerId),
        gte(telemetryEvents.periodStart, fromDate),
        lte(telemetryEvents.periodStart, toDate)
      )
    ),
  );

  // 5. Audit trail for period
  const auditEntries = await timing.timeStep("compliance_audit_entries", () =>
    db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      source: auditLog.source,
      eventType: auditLog.eventType,
      evidenceLevel: auditLog.evidenceLevel,
      repo: auditLog.repo,
      sessionId: auditLog.sessionId,
      description: auditLog.description,
      ipAddress: auditLog.ipAddress,
      occurredAt: auditLog.occurredAt,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.orgId, ownerId),
        gte(auditLog.occurredAt, fromDate),
        lte(auditLog.occurredAt, toDate)
      )
    )
    .orderBy(desc(auditLog.occurredAt), desc(auditLog.createdAt))
    .limit(500),
  );

  const [auditTotals] = await timing.timeStep("compliance_audit_totals", () =>
    db
    .select({
      totalEvents: sql<number>`coalesce(sum(${auditDaily.totalCount}), 0)`,
      requiredAuditEvents: sql<number>`coalesce(sum(${auditDaily.requiredCount}), 0)`,
      clientAuditEvents: sql<number>`coalesce(sum(${auditDaily.clientCount}), 0)`,
    })
    .from(auditDaily)
    .where(
      and(
        eq(auditDaily.orgId, ownerId),
        gte(auditDaily.date, fromDay),
        lte(auditDaily.date, toDay)
      )
    ),
  );

  // 6. Review evidence for period
  const [reviewTotals] = await timing.timeStep("compliance_review_totals", () =>
    db
    .select({
      total: sql<number>`coalesce(sum(${reviewsDaily.totalCount}), 0)`,
      passed: sql<number>`coalesce(sum(${reviewsDaily.passedCount}), 0)`,
      failed: sql<number>`coalesce(sum(${reviewsDaily.failedCount}), 0)`,
      blockingFailures: sql<number>`coalesce(sum(${reviewsDaily.errorCount}), 0)`,
      warnings: sql<number>`coalesce(sum(${reviewsDaily.warningCount}), 0)`,
    })
    .from(reviewsDaily)
    .where(
      and(
        eq(reviewsDaily.orgId, ownerId),
        gte(reviewsDaily.date, fromDay),
        lte(reviewsDaily.date, toDay)
      )
    ),
  );

  // 7. Workflow evidence for period
  const [workflowTotals] = await timing.timeStep("compliance_workflow_totals", () =>
    db
    .select({
      total: sql<number>`count(*)`,
      approved: sql<number>`count(*) filter (where ${workflowSnapshots.approvalStatus} = 'approved')`,
      ready: sql<number>`count(*) filter (where ${workflowSnapshots.approvalStatus} = 'ready')`,
      blocked: sql<number>`count(*) filter (where ${workflowSnapshots.approvalStatus} = 'blocked')`,
    })
    .from(workflowSnapshots)
    .where(
      and(
        eq(workflowSnapshots.orgId, ownerId),
        gte(workflowSnapshots.receivedAt, fromDate),
        lte(workflowSnapshots.receivedAt, toDate)
      )
    ),
  );

  const latestWorkflow = await timing.timeStep("compliance_latest_workflow", () =>
    db
    .select({
      repo: workflowSnapshots.repo,
      sessionId: workflowSnapshots.sessionId,
      phase: workflowSnapshots.phase,
      approvalStatus: workflowSnapshots.approvalStatus,
      planStatus: workflowSnapshots.planStatus,
      reviewStatus: workflowSnapshots.reviewStatus,
      receivedAt: workflowSnapshots.receivedAt,
    })
    .from(workflowSnapshots)
    .where(
      and(
        eq(workflowSnapshots.orgId, ownerId),
        gte(workflowSnapshots.receivedAt, fromDate),
        lte(workflowSnapshots.receivedAt, toDate)
      )
    )
    .orderBy(desc(workflowSnapshots.receivedAt))
    .limit(10),
  );

  logAudit({
    orgId: ownerId,
    userId: owner.userId,
    action: "export",
    resourceType: "report",
    description: `Exported compliance report ${from} to ${to}`,
    req,
  });

  const reviewTotal = Number(reviewTotals?.total ?? 0);
  const reviewPassed = Number(reviewTotals?.passed ?? 0);
  const reviewFailed = Number(reviewTotals?.failed ?? 0);
  const reviewBlockingFailures = Number(reviewTotals?.blockingFailures ?? 0);
  const reviewWarnings = Number(reviewTotals?.warnings ?? 0);
  const reviewPassRate =
    reviewTotal > 0 ? Math.round((reviewPassed / reviewTotal) * 1000) / 10 : null;

  const workflowSnapshotCount = Number(workflowTotals?.total ?? 0);
  const workflowApprovedCount = Number(workflowTotals?.approved ?? 0);
  const workflowReadyCount = Number(workflowTotals?.ready ?? 0);
  const workflowBlockedCount = Number(workflowTotals?.blocked ?? 0);

  const auditEvidence = summarizeAuditEvidence(auditEntries, auditTotals);

  const controlMatrix = buildControlMatrix({
    activePolicies: activePolicies.length,
    enforcedPolicies: activePolicies.filter((p) => p.enforce).length,
    activeKeys: activeKeys.length,
    revokedKeysInPeriod: revokedKeysInPeriod.length,
    telemetryPushes: Number(telemetry?.pushCount ?? 0),
    totalToolCalls: Number(telemetry?.toolCalls ?? 0),
    auditEvents: auditEvidence.totalEvents,
    requiredAuditEvents: auditEvidence.requiredAuditEvents,
    clientAuditEvents: auditEvidence.clientAuditEvents,
    reviewTotal,
    reviewFailures: reviewFailed,
    workflowSnapshots: workflowSnapshotCount,
    approvedWorkflowSnapshots: workflowApprovedCount,
    boundaryDocumented: true,
  });

  const regulatoryPackPreview = buildRegulatoryPackPreview({
    activePolicies: activePolicies.map((p) => ({
      id: p.id,
      title: p.title,
      ruleId: p.ruleId,
      status: p.status,
      severity: p.severity,
      enforce: p.enforce,
    })),
    violationsByRule: violationsByRule.map((v) => ({
      ruleId: v.ruleId,
      count: Number(v.count),
    })),
  });

  const report = {
    ...buildComplianceReportContract({
      generatedAt: new Date().toISOString(),
      periodFrom: from,
      periodTo: to,
      orgId: ownerId,
      controlMapping: controlMatrix,
      regulatoryPackPreview,
    }),

    // ISO 27001 A.5 / SOC 2 CC1 — Information Security Policies
    policyGovernance: {
      totalActivePolicies: activePolicies.length,
      enforcedPolicies: activePolicies.filter((p) => p.enforce).length,
      disabledPolicies: activePolicies.filter((p) => !p.enforce).length,
      policies: activePolicies,
    },

    // ISO 27001 A.9 / SOC 2 CC6 — Access Control
    accessControl: {
      totalActiveKeys: activeKeys.length,
      keysRevokedInPeriod: revokedKeysInPeriod.length,
      apiKeys: allKeys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.keyPrefix,
        scopes: k.scopes,
        status: k.revokedAt ? "revoked" : "active",
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        revokedAt: k.revokedAt,
      })),
    },

    // ISO 27001 A.12.4 / SOC 2 CC7 — Logging & Monitoring
    violations: {
      total: Number(violationTotals?.total ?? 0),
      errors: Number(violationTotals?.errors ?? 0),
      warnings: Number(violationTotals?.warnings ?? 0),
      info: Number(violationTotals?.info ?? 0),
      byRule: violationsByRule.map((r) => ({
        ruleId: r.ruleId,
        ruleTitle: r.ruleTitle ?? r.ruleId,
        policySeverity: r.policySeverity ?? null,
        count: Number(r.count),
        errors: Number(r.errors),
        warnings: Number(r.warnings),
      })),
    },

    // ISO 27001 A.12.4.1 / SOC 2 CC7.2 — Audit Trail
    auditTrail: {
      totalEvents: auditEvidence.totalEvents,
      retention: AUDIT_RETENTION_POLICY,
      events: auditEntries,
    },

    reviewEvidence: {
      total: reviewTotal,
      passed: reviewPassed,
      failed: reviewFailed,
      blockingFailures: reviewBlockingFailures,
      warnings: reviewWarnings,
      passRate: reviewPassRate,
    },

    workflowEvidence: {
      totalSnapshots: workflowSnapshotCount,
      approvedSnapshots: workflowApprovedCount,
      readySnapshots: workflowReadyCount,
      blockedSnapshots: workflowBlockedCount,
      recent: latestWorkflow,
    },

    // System Usage
    telemetry: {
      retention: TELEMETRY_RETENTION_POLICY,
      totalToolCalls: Number(telemetry?.toolCalls ?? 0),
      successfulToolCalls: Number(telemetry?.successfulToolCalls ?? 0),
      failedToolCalls: Number(telemetry?.failedToolCalls ?? 0),
      totalDurationMs: Number(telemetry?.totalDurationMs ?? 0),
      sessionStarts: Number(telemetry?.sessionStarts ?? 0),
      sessionEnds: Number(telemetry?.sessionEnds ?? 0),
      totalSearches: Number(telemetry?.searches ?? 0),
      totalTokensSaved: Number(telemetry?.tokensSaved ?? 0),
      totalResultsReturned: Number(telemetry?.resultsReturned ?? 0),
      telemetryPushes: Number(telemetry?.pushCount ?? 0),
      activeInstances: Number(telemetryInstances?.distinctInstances ?? 0),
    },

  };

  return timing.attach(NextResponse.json(report));
}
