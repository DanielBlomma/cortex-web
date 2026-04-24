import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apiKeys,
  auditDaily,
  operationsSnapshots,
  policies,
  reviews,
  telemetryDaily,
  telemetryEvents,
  workflowSessions,
} from "@/db/schema";

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function seedOperationsSnapshot(orgId: string): Promise<void> {
  await db
    .insert(operationsSnapshots)
    .values({ orgId })
    .onConflictDoNothing({ target: operationsSnapshots.orgId });
}

export async function refreshOperationsSnapshot(orgId: string): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3_600_000);

  const [
    keyRows,
    policyRows,
    telemetryActivityRows,
    telemetryRollupRows,
    auditRows,
    workflowRows,
    reviewRows,
  ] = await Promise.all([
    db
      .select({
        activeApiKeys: sql<number>`count(*)`,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt))),
    db
      .select({
        activePolicies: sql<number>`count(*) filter (where ${policies.status} = 'active')`,
        enforcedPolicies: sql<number>`count(*) filter (where ${policies.status} = 'active' and ${policies.enforce} = true)`,
        blockingPolicies: sql<number>`count(*) filter (where ${policies.status} = 'active' and ${policies.severity} in ('block', 'error'))`,
      })
      .from(policies)
      .where(eq(policies.orgId, orgId)),
    db
      .select({
        activeInstances: sql<number>`count(distinct coalesce(${telemetryEvents.instanceId}, ${telemetryEvents.apiKeyId}::text))`,
        distinctVersions: sql<number>`count(distinct ${telemetryEvents.clientVersion}) filter (where ${telemetryEvents.clientVersion} is not null)`,
        lastTelemetryAt: sql<string>`max(${telemetryEvents.receivedAt})`,
      })
      .from(telemetryEvents)
      .where(eq(telemetryEvents.orgId, orgId)),
    db
      .select({
        totalToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalToolCalls}), 0)`,
        failedToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalFailedToolCalls}), 0)`,
      })
      .from(telemetryDaily)
      .where(eq(telemetryDaily.orgId, orgId)),
    db
      .select({
        lastAuditAt: sql<string>`max(${auditDaily.lastOccurredAt})`,
        lastPolicySyncAt: sql<string>`max(${auditDaily.lastPolicySyncAt})`,
        requiredAuditEvents30d: sql<number>`coalesce(sum(${auditDaily.requiredCount}) filter (where ${auditDaily.date} >= ${thirtyDaysAgo.toISOString().slice(0, 10)}::date), 0)`,
      })
      .from(auditDaily)
      .where(eq(auditDaily.orgId, orgId)),
    db
      .select({
        workflowSessions30d: sql<number>`count(*)`,
        approvedSessions30d: sql<number>`count(*) filter (where ${workflowSessions.approvalStatus} = 'approved')`,
        blockedSessions30d: sql<number>`count(*) filter (where ${workflowSessions.approvalStatus} = 'blocked')`,
      })
      .from(workflowSessions)
      .where(
        and(
          eq(workflowSessions.orgId, orgId),
          gte(workflowSessions.lastReceivedAt, thirtyDaysAgo),
        ),
      ),
    db
      .select({
        reviewedSessions30d: sql<number>`count(distinct ${reviews.sessionId})`,
      })
      .from(reviews)
      .where(and(eq(reviews.orgId, orgId), gte(reviews.reviewedAt, thirtyDaysAgo))),
  ]);

  const keyStats = keyRows[0];
  const policyStats = policyRows[0];
  const telemetryActivity = telemetryActivityRows[0];
  const telemetryRollups = telemetryRollupRows[0];
  const auditStats = auditRows[0];
  const workflowStats = workflowRows[0];
  const reviewStats = reviewRows[0];

  await db
    .insert(operationsSnapshots)
    .values({
      orgId,
      activeApiKeys: Number(keyStats?.activeApiKeys ?? 0),
      activePolicies: Number(policyStats?.activePolicies ?? 0),
      enforcedPolicies: Number(policyStats?.enforcedPolicies ?? 0),
      blockingPolicies: Number(policyStats?.blockingPolicies ?? 0),
      activeInstances: Number(telemetryActivity?.activeInstances ?? 0),
      distinctVersions: Number(telemetryActivity?.distinctVersions ?? 0),
      totalToolCalls: Number(telemetryRollups?.totalToolCalls ?? 0),
      failedToolCalls: Number(telemetryRollups?.failedToolCalls ?? 0),
      workflowSessions30d: Number(workflowStats?.workflowSessions30d ?? 0),
      reviewedSessions30d: Number(reviewStats?.reviewedSessions30d ?? 0),
      approvedSessions30d: Number(workflowStats?.approvedSessions30d ?? 0),
      blockedSessions30d: Number(workflowStats?.blockedSessions30d ?? 0),
      requiredAuditEvents30d: Number(auditStats?.requiredAuditEvents30d ?? 0),
      lastPolicySyncAt: asDate(auditStats?.lastPolicySyncAt),
      lastTelemetryAt: asDate(telemetryActivity?.lastTelemetryAt),
      lastAuditAt: asDate(auditStats?.lastAuditAt),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: operationsSnapshots.orgId,
      set: {
        activeApiKeys: Number(keyStats?.activeApiKeys ?? 0),
        activePolicies: Number(policyStats?.activePolicies ?? 0),
        enforcedPolicies: Number(policyStats?.enforcedPolicies ?? 0),
        blockingPolicies: Number(policyStats?.blockingPolicies ?? 0),
        activeInstances: Number(telemetryActivity?.activeInstances ?? 0),
        distinctVersions: Number(telemetryActivity?.distinctVersions ?? 0),
        totalToolCalls: Number(telemetryRollups?.totalToolCalls ?? 0),
        failedToolCalls: Number(telemetryRollups?.failedToolCalls ?? 0),
        workflowSessions30d: Number(workflowStats?.workflowSessions30d ?? 0),
        reviewedSessions30d: Number(reviewStats?.reviewedSessions30d ?? 0),
        approvedSessions30d: Number(workflowStats?.approvedSessions30d ?? 0),
        blockedSessions30d: Number(workflowStats?.blockedSessions30d ?? 0),
        requiredAuditEvents30d: Number(auditStats?.requiredAuditEvents30d ?? 0),
        lastPolicySyncAt: asDate(auditStats?.lastPolicySyncAt),
        lastTelemetryAt: asDate(telemetryActivity?.lastTelemetryAt),
        lastAuditAt: asDate(auditStats?.lastAuditAt),
        updatedAt: new Date(),
      },
    });
}
