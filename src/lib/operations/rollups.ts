import { sql } from "drizzle-orm";
import { db } from "@/db";
import { auditDaily, policyRuleStats, workflowSessions } from "@/db/schema";

type DbLike = Pick<typeof db, "insert">;

type AuditDailyInput = {
  orgId: string;
  occurredAt: Date;
  source: "web" | "client";
  evidenceLevel: "required" | "diagnostic";
  eventType?: string | null;
};

type WorkflowSessionInput = {
  orgId: string;
  sessionId: string;
  repo: string | null;
  instanceId: string | null;
  phase: string;
  approvalStatus: string;
  planStatus: string;
  reviewStatus: string;
  blockedReasons: unknown;
  lastReceivedAt?: Date;
};

type PolicyRuleStatsInput = {
  orgId: string;
  ruleId: string;
  reviewFailureCount?: number;
  warningReviewCount?: number;
  lastReviewAt?: Date | null;
  violationCount?: number;
  lastViolationAt?: Date | null;
};

function isoDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function upsertAuditDaily(
  dbLike: DbLike,
  input: AuditDailyInput,
): Promise<void> {
  await dbLike
    .insert(auditDaily)
    .values({
      orgId: input.orgId,
      date: isoDayKey(input.occurredAt),
      totalCount: 1,
      requiredCount: input.evidenceLevel === "required" ? 1 : 0,
      diagnosticCount: input.evidenceLevel === "diagnostic" ? 1 : 0,
      clientCount: input.source === "client" ? 1 : 0,
      webCount: input.source === "web" ? 1 : 0,
      lastOccurredAt: input.occurredAt,
      lastPolicySyncAt:
        input.eventType === "policy_sync" ? input.occurredAt : null,
    })
    .onConflictDoUpdate({
      target: [auditDaily.orgId, auditDaily.date],
      set: {
        totalCount: sql`${auditDaily.totalCount} + 1`,
        requiredCount:
          input.evidenceLevel === "required"
            ? sql`${auditDaily.requiredCount} + 1`
            : auditDaily.requiredCount,
        diagnosticCount:
          input.evidenceLevel === "diagnostic"
            ? sql`${auditDaily.diagnosticCount} + 1`
            : auditDaily.diagnosticCount,
        clientCount:
          input.source === "client"
            ? sql`${auditDaily.clientCount} + 1`
            : auditDaily.clientCount,
        webCount:
          input.source === "web"
            ? sql`${auditDaily.webCount} + 1`
            : auditDaily.webCount,
        lastOccurredAt: sql`greatest(coalesce(${auditDaily.lastOccurredAt}, ${input.occurredAt}), ${input.occurredAt})`,
        lastPolicySyncAt:
          input.eventType === "policy_sync"
            ? sql`greatest(coalesce(${auditDaily.lastPolicySyncAt}, ${input.occurredAt}), ${input.occurredAt})`
            : auditDaily.lastPolicySyncAt,
      },
    });
}

export async function upsertWorkflowSession(
  dbLike: DbLike,
  input: WorkflowSessionInput,
): Promise<void> {
  const lastReceivedAt = input.lastReceivedAt ?? new Date();
  await dbLike
    .insert(workflowSessions)
    .values({
      orgId: input.orgId,
      sessionId: input.sessionId,
      repo: input.repo,
      instanceId: input.instanceId,
      phase: input.phase,
      approvalStatus: input.approvalStatus,
      planStatus: input.planStatus,
      reviewStatus: input.reviewStatus,
      blockedReasons: input.blockedReasons,
      lastReceivedAt,
    })
    .onConflictDoUpdate({
      target: [workflowSessions.orgId, workflowSessions.sessionId],
      set: {
        repo: input.repo,
        instanceId: input.instanceId,
        phase: input.phase,
        approvalStatus: input.approvalStatus,
        planStatus: input.planStatus,
        reviewStatus: input.reviewStatus,
        blockedReasons: input.blockedReasons,
        lastReceivedAt,
      },
    });
}

export async function upsertPolicyRuleStats(
  dbLike: DbLike,
  input: PolicyRuleStatsInput,
): Promise<void> {
  await dbLike
    .insert(policyRuleStats)
    .values({
      orgId: input.orgId,
      ruleId: input.ruleId,
      reviewFailureCount: input.reviewFailureCount ?? 0,
      warningReviewCount: input.warningReviewCount ?? 0,
      lastReviewAt: input.lastReviewAt ?? null,
      violationCount: input.violationCount ?? 0,
      lastViolationAt: input.lastViolationAt ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [policyRuleStats.orgId, policyRuleStats.ruleId],
      set: {
        reviewFailureCount: sql`${policyRuleStats.reviewFailureCount} + ${input.reviewFailureCount ?? 0}`,
        warningReviewCount: sql`${policyRuleStats.warningReviewCount} + ${input.warningReviewCount ?? 0}`,
        lastReviewAt:
          input.lastReviewAt
            ? sql`greatest(coalesce(${policyRuleStats.lastReviewAt}, ${input.lastReviewAt}), ${input.lastReviewAt})`
            : policyRuleStats.lastReviewAt,
        violationCount: sql`${policyRuleStats.violationCount} + ${input.violationCount ?? 0}`,
        lastViolationAt:
          input.lastViolationAt
            ? sql`greatest(coalesce(${policyRuleStats.lastViolationAt}, ${input.lastViolationAt}), ${input.lastViolationAt})`
            : policyRuleStats.lastViolationAt,
        updatedAt: new Date(),
      },
    });
}
