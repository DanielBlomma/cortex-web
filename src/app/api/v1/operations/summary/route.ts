import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apiKeys,
  auditLog,
  organizations,
  policies,
  reviews,
  telemetryEvents,
  workflowSnapshots,
} from "@/db/schema";
import { buildOperationalHealthSummary } from "@/lib/operations/health";
import {
  createSummaryWarning,
  settleOperationsQuery,
} from "@/lib/operations/summary";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const rl = applyRateLimit(req, 30);
    if (rl) return rl;

    const { orgId, userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = orgId ?? `personal_${userId}`;
    await ensureRuntimeSchema();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3_600_000);
    const warnings: {
      code: "schema_unavailable" | "summary_unavailable";
      detail: string;
    }[] = [];

    const [
      orgRows,
      keyRows,
      policyRows,
      telemetryRows,
      auditRows,
      workflowRows,
      reviewRows,
    ] = await Promise.all([
      settleOperationsQuery(
        "organization plan",
        db
          .select({ plan: organizations.plan })
          .from(organizations)
          .where(eq(organizations.id, ownerId))
          .limit(1),
        [],
        warnings,
      ),
      settleOperationsQuery(
        "api key counts",
        db
          .select({
            activeApiKeys: sql<number>`count(*)`,
          })
          .from(apiKeys)
          .where(and(eq(apiKeys.orgId, ownerId), isNull(apiKeys.revokedAt))),
        [],
        warnings,
      ),
      settleOperationsQuery(
        "policy health aggregates",
        db
          .select({
            activePolicies: sql<number>`count(*) filter (where ${policies.status} = 'active')`,
            enforcedPolicies: sql<number>`count(*) filter (where ${policies.status} = 'active' and ${policies.enforce} = true)`,
            blockingPolicies: sql<number>`count(*) filter (where ${policies.status} = 'active' and ${policies.severity} in ('block', 'error'))`,
          })
          .from(policies)
          .where(eq(policies.orgId, ownerId)),
        [],
        warnings,
      ),
      settleOperationsQuery(
        "telemetry aggregates",
        db
          .select({
            activeInstances: sql<number>`count(distinct coalesce(${telemetryEvents.instanceId}, ${telemetryEvents.apiKeyId}::text))`,
            distinctVersions: sql<number>`count(distinct ${telemetryEvents.clientVersion}) filter (where ${telemetryEvents.clientVersion} is not null)`,
            lastTelemetryAt: sql<string>`max(${telemetryEvents.receivedAt})`,
            totalToolCalls: sql<number>`coalesce(sum(${telemetryEvents.totalToolCalls}), 0)`,
            failedToolCalls: sql<number>`coalesce(sum(${telemetryEvents.failedToolCalls}), 0)`,
          })
          .from(telemetryEvents)
          .where(eq(telemetryEvents.orgId, ownerId)),
        [],
        warnings,
      ),
      settleOperationsQuery(
        "audit aggregates",
        db
          .select({
            lastAuditAt: sql<string>`max(${auditLog.occurredAt})`,
            lastPolicySyncAt: sql<string>`max(${auditLog.occurredAt}) filter (where ${auditLog.eventType} = 'policy_sync')`,
            requiredAuditEvents30d: sql<number>`count(*) filter (where ${auditLog.evidenceLevel} = 'required' and ${auditLog.occurredAt} >= ${thirtyDaysAgo})`,
          })
          .from(auditLog)
          .where(eq(auditLog.orgId, ownerId)),
        [],
        warnings,
      ),
      settleOperationsQuery(
        "workflow aggregates",
        db
          .select({
            workflowSessions30d: sql<number>`count(distinct ${workflowSnapshots.sessionId})`,
            approvedSessions30d: sql<number>`count(distinct ${workflowSnapshots.sessionId}) filter (where ${workflowSnapshots.approvalStatus} = 'approved')`,
            blockedSessions30d: sql<number>`count(distinct ${workflowSnapshots.sessionId}) filter (where ${workflowSnapshots.approvalStatus} = 'blocked')`,
          })
          .from(workflowSnapshots)
          .where(
            and(
              eq(workflowSnapshots.orgId, ownerId),
              gte(workflowSnapshots.receivedAt, thirtyDaysAgo),
            ),
          ),
        [],
        warnings,
      ),
      settleOperationsQuery(
        "review coverage aggregates",
        db
          .select({
            reviewedSessions30d: sql<number>`count(distinct ${reviews.sessionId})`,
          })
          .from(reviews)
          .where(
            and(
              eq(reviews.orgId, ownerId),
              gte(reviews.reviewedAt, thirtyDaysAgo),
            ),
          ),
        [],
        warnings,
      ),
    ]);

    const org = orgRows[0];
    const keyStats = keyRows[0];
    const policyStats = policyRows[0];
    const telemetryStats = telemetryRows[0];
    const auditStats = auditRows[0];
    const workflowStats = workflowRows[0];
    const reviewStats = reviewRows[0];

    const summary = buildOperationalHealthSummary({
      plan: org?.plan ?? "free",
      activePolicies: Number(policyStats?.activePolicies ?? 0),
      enforcedPolicies: Number(policyStats?.enforcedPolicies ?? 0),
      blockingPolicies: Number(policyStats?.blockingPolicies ?? 0),
      activeApiKeys: Number(keyStats?.activeApiKeys ?? 0),
      activeInstances: Number(telemetryStats?.activeInstances ?? 0),
      distinctVersions: Number(telemetryStats?.distinctVersions ?? 0),
      lastPolicySyncAt: auditStats?.lastPolicySyncAt ?? null,
      lastTelemetryAt: telemetryStats?.lastTelemetryAt ?? null,
      totalToolCalls: Number(telemetryStats?.totalToolCalls ?? 0),
      failedToolCalls: Number(telemetryStats?.failedToolCalls ?? 0),
      workflowSessions30d: Number(workflowStats?.workflowSessions30d ?? 0),
      reviewedSessions30d: Number(reviewStats?.reviewedSessions30d ?? 0),
      approvedSessions30d: Number(workflowStats?.approvedSessions30d ?? 0),
      blockedSessions30d: Number(workflowStats?.blockedSessions30d ?? 0),
      requiredAuditEvents30d: Number(auditStats?.requiredAuditEvents30d ?? 0),
      lastAuditAt: auditStats?.lastAuditAt ?? null,
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary,
      warnings,
    });
  } catch (error) {
    console.error("[operations.summary] Failed to build operations summary", error);
    const summary = buildOperationalHealthSummary({
      plan: "free",
      activePolicies: 0,
      enforcedPolicies: 0,
      blockingPolicies: 0,
      activeApiKeys: 0,
      activeInstances: 0,
      distinctVersions: 0,
      lastPolicySyncAt: null,
      lastTelemetryAt: null,
      totalToolCalls: 0,
      failedToolCalls: 0,
      workflowSessions30d: 0,
      reviewedSessions30d: 0,
      approvedSessions30d: 0,
      blockedSessions30d: 0,
      requiredAuditEvents30d: 0,
      lastAuditAt: null,
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary,
      warnings: [createSummaryWarning(error)],
    });
  }
}
