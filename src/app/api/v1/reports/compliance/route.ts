import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  auditLog,
  policies,
  apiKeys,
  policyViolations,
  telemetryEvents,
  reviews,
  workflowSnapshots,
} from "@/db/schema";
import { eq, sql, and, gte, lte, isNull, desc } from "drizzle-orm";
import { getOwnerId } from "@/lib/auth/owner";
import { logAudit } from "@/lib/audit/log";
import { AUDIT_RETENTION_POLICY } from "@/lib/audit/retention";
import { TELEMETRY_RETENTION_POLICY } from "@/lib/telemetry/retention";
import {
  buildControlMatrix,
  RESIDUAL_CUSTOMER_RESPONSIBILITIES,
} from "@/lib/compliance/control-mapping";
import { summarizeAuditEvidence } from "@/lib/compliance/audit-evidence";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const rl = applyRateLimit(req, 5);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query parameters are required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T23:59:59Z`);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const ownerId = owner.ownerId;

  // 1. Policy governance
  const activePolicies = await db
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
    .orderBy(policies.priority);

  // 2. API key inventory
  const allKeys = await db
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
    .orderBy(apiKeys.createdAt);

  const activeKeys = allKeys.filter((k) => !k.revokedAt);
  const revokedKeysInPeriod = allKeys.filter(
    (k) => k.revokedAt && k.revokedAt >= fromDate && k.revokedAt <= toDate
  );

  // 3. Violations in period
  const [violationTotals] = await db
    .select({
      total: sql<number>`count(*)`,
      errors: sql<number>`count(*) filter (where ${policyViolations.severity} = 'error')`,
      warnings: sql<number>`count(*) filter (where ${policyViolations.severity} = 'warning')`,
      info: sql<number>`count(*) filter (where ${policyViolations.severity} = 'info')`,
    })
    .from(policyViolations)
    .where(
      and(
        eq(policyViolations.orgId, ownerId),
        gte(policyViolations.occurredAt, fromDate),
        lte(policyViolations.occurredAt, toDate)
      )
    );

  const violationsByRule = await db
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
    .orderBy(desc(sql`count(*)`));

  // 4. Telemetry summary for period
  const [telemetry] = await db
    .select({
      toolCalls: sql<number>`coalesce(sum(${telemetryEvents.totalToolCalls}), 0)`,
      successfulToolCalls: sql<number>`coalesce(sum(${telemetryEvents.successfulToolCalls}), 0)`,
      failedToolCalls: sql<number>`coalesce(sum(${telemetryEvents.failedToolCalls}), 0)`,
      totalDurationMs: sql<number>`coalesce(sum(${telemetryEvents.totalDurationMs}), 0)`,
      sessionStarts: sql<number>`coalesce(sum(${telemetryEvents.sessionStarts}), 0)`,
      sessionEnds: sql<number>`coalesce(sum(${telemetryEvents.sessionEnds}), 0)`,
      searches: sql<number>`coalesce(sum(${telemetryEvents.searches}), 0)`,
      tokensSaved: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensSaved}), 0)`,
      resultsReturned: sql<number>`coalesce(sum(${telemetryEvents.totalResultsReturned}), 0)`,
      pushCount: sql<number>`count(*)`,
      distinctInstances: sql<number>`count(distinct coalesce(${telemetryEvents.instanceId}, ${telemetryEvents.apiKeyId}::text))`,
    })
    .from(telemetryEvents)
    .where(
      and(
        eq(telemetryEvents.orgId, ownerId),
        gte(telemetryEvents.periodStart, fromDate),
        lte(telemetryEvents.periodStart, toDate)
      )
    );

  // 5. Audit trail for period
  const auditEntries = await db
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
    .limit(500);

  const [auditTotals] = await db
    .select({
      totalEvents: sql<number>`count(*)`,
      requiredAuditEvents: sql<number>`count(*) filter (where ${auditLog.evidenceLevel} = 'required')`,
      clientAuditEvents: sql<number>`count(*) filter (where ${auditLog.source} = 'client')`,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.orgId, ownerId),
        gte(auditLog.occurredAt, fromDate),
        lte(auditLog.occurredAt, toDate)
      )
    );

  // 6. Review evidence for period
  const [reviewTotals] = await db
    .select({
      total: sql<number>`count(*)`,
      passed: sql<number>`count(*) filter (where ${reviews.pass} = true)`,
      failed: sql<number>`count(*) filter (where ${reviews.pass} = false)`,
      blockingFailures: sql<number>`count(*) filter (where ${reviews.pass} = false and ${reviews.severity} = 'error')`,
      warnings: sql<number>`count(*) filter (where ${reviews.pass} = false and ${reviews.severity} = 'warning')`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.orgId, ownerId),
        gte(reviews.reviewedAt, fromDate),
        lte(reviews.reviewedAt, toDate)
      )
    );

  // 7. Workflow evidence for period
  const [workflowTotals] = await db
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
    );

  const latestWorkflow = await db
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
    .limit(10);

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

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      periodFrom: from,
      periodTo: to,
      orgId: ownerId,
      framework: ["ISO 27001", "ISO 42001", "SOC 2 Type II"],
    },

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
      activeInstances: Number(telemetry?.distinctInstances ?? 0),
    },

    controlMapping: controlMatrix,

    residualResponsibilities: [...RESIDUAL_CUSTOMER_RESPONSIBILITIES],
  };

  return NextResponse.json(report);
}
