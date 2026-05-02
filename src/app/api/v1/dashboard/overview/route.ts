import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apiKeys,
  operationsSnapshots,
  organizations,
  policies,
  policyViolations,
  policyRuleStats,
  telemetryDaily,
  telemetryEvents,
  violationsDaily,
} from "@/db/schema";
import { applyRateLimit } from "@/lib/rate-limit";
import { getOwnerId } from "@/lib/auth/owner";
import {
  assertOrgScopeHasDataOrThrow,
  OrgScopeMismatchError,
} from "@/lib/org-scope";
import { buildOperationalHealthSummary } from "@/lib/operations/health";
import { createRequestTiming } from "@/lib/perf/request-timing";
import { cacheOwnerRoute } from "@/lib/cache/owner-route-cache";

const AVG_TOKENS_PER_RESULT = 400;

class DashboardOverviewQueryError extends Error {
  constructor(
    public step: string,
    public cause: unknown,
  ) {
    super(`Failed to load dashboard overview at ${step}`);
    this.name = "DashboardOverviewQueryError";
  }
}

function describeError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : null;
    return code ? `${code}: ${error.message}` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

async function runStep<T>(
  timing: ReturnType<typeof createRequestTiming>,
  step: string,
  query: () => Promise<T>,
): Promise<T> {
  try {
    return await timing.timeStep(step, query);
  } catch (error) {
    throw new DashboardOverviewQueryError(step, error);
  }
}

function estimateTotal(
  saved: number,
  resultsReturned: number,
  reportedTotal: number,
): number {
  if (reportedTotal > 0) return reportedTotal;
  if (saved <= 0) return 0;
  return saved + resultsReturned * AVG_TOKENS_PER_RESULT;
}

export async function GET(req: Request) {
  const timing = createRequestTiming();

  try {
    const rl = applyRateLimit(req, 30);
    if (rl) return rl;

    const owner = await timing.timeStep("resolve_owner", () => getOwnerId());
    if (!owner) {
      return timing.attach(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }

    const ownerId = owner.ownerId;
    await timing.timeStep("assert_org_scope", () =>
      assertOrgScopeHasDataOrThrow(ownerId, owner.userId),
    );

    const payload = await timing.timeStep("route_cache", () =>
      cacheOwnerRoute({
        namespace: "dashboard-overview",
        ownerId,
        load: async () => {
          const [
            orgRows,
            snapshotRows,
            telemetryTotalsRows,
            telemetryActivityRows,
            telemetryDailyRows,
            telemetryVersionRows,
            violationSeverityRows,
            violationRecentRows,
            keyCountRows,
            keyRows,
            policyCountRows,
            policyRows,
            reviewStats,
          ] = await timing.timeStep("load_overview_dependencies", () =>
            Promise.all([
      runStep(timing, "organization", () =>
        db
          .select({ plan: organizations.plan })
          .from(organizations)
          .where(eq(organizations.id, ownerId))
          .limit(1),
      ),
      runStep(timing, "operations_snapshot", () =>
        db
          .select()
          .from(operationsSnapshots)
          .where(eq(operationsSnapshots.orgId, ownerId))
          .limit(1),
      ),
      runStep(timing, "telemetry_totals", () =>
        db
          .select({
            totalToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalToolCalls}), 0)`,
            totalSuccessfulToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalSuccessfulToolCalls}), 0)`,
            totalFailedToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalFailedToolCalls}), 0)`,
            totalDurationMs: sql<number>`coalesce(sum(${telemetryDaily.totalDurationMs}), 0)`,
            totalSearches: sql<number>`coalesce(sum(${telemetryDaily.totalSearches}), 0)`,
            totalResultsReturned: sql<number>`coalesce(sum(${telemetryDaily.totalResultsReturned}), 0)`,
            totalTokensSaved: sql<number>`coalesce(sum(${telemetryDaily.totalTokensSaved}), 0)`,
            totalTokensTotal: sql<number>`coalesce(sum(${telemetryDaily.totalTokensTotal}), 0)`,
            eventCount: sql<number>`coalesce(sum(${telemetryDaily.pushCount}), 0)`,
          })
          .from(telemetryDaily)
          .where(eq(telemetryDaily.orgId, ownerId)),
      ),
      runStep(timing, "telemetry_activity", () =>
        db
          .select({
            lastTelemetryAt: sql<string>`max(${telemetryEvents.receivedAt})`,
            distinctInstances: sql<number>`count(distinct coalesce(${telemetryEvents.instanceId}, ${telemetryEvents.apiKeyId}::text))`,
          })
          .from(telemetryEvents)
          .where(eq(telemetryEvents.orgId, ownerId)),
      ),
      runStep(timing, "telemetry_daily", () =>
        db
          .select({
            date: sql<string>`${telemetryDaily.date}::text`,
            searches: telemetryDaily.totalSearches,
            resultsReturned: telemetryDaily.totalResultsReturned,
            tokensSaved: telemetryDaily.totalTokensSaved,
            tokensTotal: telemetryDaily.totalTokensTotal,
          })
          .from(telemetryDaily)
          .where(eq(telemetryDaily.orgId, ownerId))
          .orderBy(desc(telemetryDaily.date))
          .limit(30),
      ),
      runStep(timing, "telemetry_versions", () =>
        db
          .select({
            version: telemetryEvents.clientVersion,
            instances: sql<number>`count(distinct coalesce(${telemetryEvents.instanceId}, ${telemetryEvents.apiKeyId}::text))`,
            lastSeen: sql<string>`max(${telemetryEvents.receivedAt})`,
          })
          .from(telemetryEvents)
          .where(eq(telemetryEvents.orgId, ownerId))
          .groupBy(telemetryEvents.clientVersion)
          .orderBy(desc(sql`max(${telemetryEvents.receivedAt})`))
          .limit(10),
      ),
      runStep(timing, "violation_severity", () =>
        db
          .select({
            total: sql<number>`coalesce(sum(${violationsDaily.totalCount}), 0)`,
            errors: sql<number>`coalesce(sum(${violationsDaily.errorCount}), 0)`,
            warnings: sql<number>`coalesce(sum(${violationsDaily.warningCount}), 0)`,
            info: sql<number>`coalesce(sum(${violationsDaily.infoCount}), 0)`,
          })
          .from(violationsDaily)
          .where(eq(violationsDaily.orgId, ownerId)),
      ),
      runStep(timing, "violation_recent", () =>
        db
          .select({
            id: policyViolations.id,
            repo: policyViolations.repo,
            ruleId: policyViolations.ruleId,
            ruleTitle: policies.title,
            policySeverity: policies.severity,
            policyStatus: policies.status,
            severity: policyViolations.severity,
            message: policyViolations.message,
            occurredAt: policyViolations.occurredAt,
          })
          .from(policyViolations)
          .leftJoin(
            policies,
            and(
              eq(policies.orgId, ownerId),
              eq(policies.ruleId, policyViolations.ruleId),
            ),
          )
          .where(eq(policyViolations.orgId, ownerId))
          .orderBy(desc(policyViolations.occurredAt))
          .limit(3),
      ),
      runStep(timing, "api_key_count", () =>
        db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(apiKeys)
          .where(and(eq(apiKeys.orgId, ownerId), isNull(apiKeys.revokedAt))),
      ),
      runStep(timing, "api_keys", () =>
        db
          .select({
            id: apiKeys.id,
            name: apiKeys.name,
            keyPrefix: apiKeys.keyPrefix,
            lastUsedAt: apiKeys.lastUsedAt,
            createdAt: apiKeys.createdAt,
          })
          .from(apiKeys)
          .where(and(eq(apiKeys.orgId, ownerId), isNull(apiKeys.revokedAt)))
          .orderBy(apiKeys.createdAt)
          .limit(4),
      ),
      runStep(timing, "policy_count", () =>
        db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(policies)
          .where(eq(policies.orgId, ownerId)),
      ),
      runStep(timing, "policies", () =>
        db
          .select({
            id: policies.id,
            title: policies.title,
            ruleId: policies.ruleId,
            status: policies.status,
            severity: policies.severity,
            enforce: policies.enforce,
            createdAt: policies.createdAt,
          })
          .from(policies)
          .where(eq(policies.orgId, ownerId))
          .orderBy(desc(policies.priority))
          .limit(5),
      ),
      runStep(timing, "policy_review_stats", () =>
        db
          .select({
            ruleId: policyRuleStats.ruleId,
            reviewFailureCount: policyRuleStats.reviewFailureCount,
            warningReviewCount: policyRuleStats.warningReviewCount,
            lastReviewAt: sql<string>`${policyRuleStats.lastReviewAt}`,
            violationCount: policyRuleStats.violationCount,
            lastViolationAt: sql<string>`${policyRuleStats.lastViolationAt}`,
          })
            .from(policyRuleStats)
            .where(eq(policyRuleStats.orgId, ownerId)),
      ),
    ]),
          );

          const org = orgRows[0];
          const snapshot = snapshotRows[0];
          if (!snapshot) {
            throw new Error(`Operations snapshot missing for ${ownerId}`);
          }

          const violationTotals = violationSeverityRows[0];

          const ruleStatsMap = new Map(reviewStats.map((row) => [row.ruleId, row]));

          const totals = telemetryTotalsRows[0];
          const activity = telemetryActivityRows[0];
          const tokensSaved = Number(totals?.totalTokensSaved ?? 0);
          const resultsReturned = Number(totals?.totalResultsReturned ?? 0);
          const reportedTotal = Number(totals?.totalTokensTotal ?? 0);
          const tokensTotal = estimateTotal(
            tokensSaved,
            resultsReturned,
            reportedTotal,
          );

          const operations = buildOperationalHealthSummary({
            plan: org?.plan ?? "free",
            activePolicies: snapshot.activePolicies,
            enforcedPolicies: snapshot.enforcedPolicies,
            blockingPolicies: snapshot.blockingPolicies,
            activeApiKeys: snapshot.activeApiKeys,
            activeInstances: snapshot.activeInstances,
            distinctVersions: snapshot.distinctVersions,
            lastPolicySyncAt: snapshot.lastPolicySyncAt?.toISOString() ?? null,
            lastTelemetryAt: snapshot.lastTelemetryAt?.toISOString() ?? null,
            totalToolCalls: snapshot.totalToolCalls,
            failedToolCalls: snapshot.failedToolCalls,
            workflowSessions30d: snapshot.workflowSessions30d,
            reviewedSessions30d: snapshot.reviewedSessions30d,
            approvedSessions30d: snapshot.approvedSessions30d,
            blockedSessions30d: snapshot.blockedSessions30d,
            requiredAuditEvents30d: snapshot.requiredAuditEvents30d,
            lastAuditAt: snapshot.lastAuditAt?.toISOString() ?? null,
          });

          return {
            generatedAt: new Date().toISOString(),
            operations: {
              generatedAt: new Date().toISOString(),
              summary: operations,
            },
            telemetry: {
              totals: {
                searches: Number(totals?.totalSearches ?? 0),
                tokensSaved,
                tokensTotal,
                tokensReported: reportedTotal > 0,
                eventCount: Number(totals?.eventCount ?? 0),
                activeInstances: Number(activity?.distinctInstances ?? 0),
              },
              versions: telemetryVersionRows.map((row) => ({
                version: row.version ?? "unknown",
                instances: Number(row.instances),
                lastSeen: row.lastSeen,
              })),
              daily: telemetryDailyRows.reverse().map((row) => {
                const dailySaved = Number(row.tokensSaved);
                const dailyResults = Number(row.resultsReturned);
                const dailyReported = Number(row.tokensTotal);
                return {
                  date: row.date,
                  searches: Number(row.searches),
                  tokensSaved: dailySaved,
                  tokensTotal: estimateTotal(
                    dailySaved,
                    dailyResults,
                    dailyReported,
                  ),
                };
              }),
            },
            violations: {
              severity: {
                error: Number(violationTotals?.errors ?? 0),
                warning: Number(violationTotals?.warnings ?? 0),
                info: Number(violationTotals?.info ?? 0),
              },
              total: Number(violationTotals?.total ?? 0),
              recent: violationRecentRows.map((row) => ({
                id: row.id,
                ruleId: row.ruleId,
                ruleTitle: row.ruleTitle ?? row.ruleId,
                policySeverity: row.policySeverity ?? null,
                policyStatus: row.policyStatus ?? null,
                severity: row.severity,
                message: row.message,
                repo: row.repo,
                occurredAt: row.occurredAt,
              })),
            },
            access: {
              totalKeys: Number(keyCountRows[0]?.count ?? 0),
              keys: keyRows,
            },
            policies: {
              totalPolicies: Number(policyCountRows[0]?.count ?? 0),
              items: policyRows.map((policy) => {
                const stats = ruleStatsMap.get(policy.ruleId);
                const lastTriggeredAt =
                  [stats?.lastReviewAt ?? null, stats?.lastViolationAt ?? null]
                    .filter((value): value is string => Boolean(value))
                    .sort()
                    .at(-1) ?? null;

                return {
                  ...policy,
                  lastTriggeredAt,
                  recentlyTriggered:
                    Number(stats?.reviewFailureCount ?? 0) > 0 ||
                    Number(stats?.warningReviewCount ?? 0) > 0 ||
                    Number(stats?.violationCount ?? 0) > 0,
                };
              }),
            },
          };
        },
      }),
    );

    return timing.attach(NextResponse.json(payload));
  } catch (error) {
    if (error instanceof OrgScopeMismatchError) {
      return timing.attach(
        NextResponse.json(
          {
            code: "org_scope_mismatch",
            error: error.message,
            ownerId: error.ownerId,
            availableScopes: error.availableScopes,
          },
          { status: 409 },
        ),
      );
    }

    if (error instanceof DashboardOverviewQueryError) {
      const detail = describeError(error.cause);
      console.error(
        `[dashboard.overview] Failed at ${error.step}: ${detail}`,
        error.cause,
      );
      return timing.attach(
        NextResponse.json(
          {
            code: "dashboard_overview_unavailable",
            error: error.message,
            step: error.step,
            detail,
          },
          { status: 500 },
        ),
      );
    }

    return timing.attach(
      NextResponse.json(
        {
          code: "dashboard_overview_unavailable",
          error: "Failed to load dashboard overview",
          detail: describeError(error),
        },
        { status: 500 },
      ),
    );
  }
}
