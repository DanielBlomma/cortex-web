import { NextResponse } from "next/server";
import { db } from "@/db";
import { telemetryDaily, telemetryEvents, policies } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import {
  assertOrgScopeHasDataOrThrow,
  OrgScopeMismatchError,
} from "@/lib/org-scope";
import {
  TELEMETRY_GOVERNANCE_GUIDANCE,
  TELEMETRY_RETENTION_POLICY,
} from "@/lib/telemetry/retention";
import { applyRateLimit } from "@/lib/rate-limit";
import { getOwnerId } from "@/lib/auth/owner";
import { createRequestTiming } from "@/lib/perf/request-timing";
import { cacheOwnerRoute } from "@/lib/cache/owner-route-cache";

// Average tokens per context result — used to estimate total token cost
// when enterprise hasn't sent estimated_tokens_total yet.
const AVG_TOKENS_PER_RESULT = 400;

class TelemetrySummaryQueryError extends Error {
  constructor(
    public step: string,
    public cause: unknown,
  ) {
    super(`Failed to load telemetry summary at ${step}`);
    this.name = "TelemetrySummaryQueryError";
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
    throw new TelemetrySummaryQueryError(step, error);
  }
}

function estimateTotal(
  saved: number,
  resultsReturned: number,
  reportedTotal: number
): number {
  if (reportedTotal > 0) return reportedTotal;
  if (saved <= 0) return 0;
  // tokens_used ≈ results * avg_tokens  →  total = used + saved
  return saved + resultsReturned * AVG_TOKENS_PER_RESULT;
}

export async function GET(req: Request) {
  const timing = createRequestTiming();

  try {
    const rl = applyRateLimit(req, 30);
    if (rl) return rl;

    const owner = await timing.timeStep("resolve_owner", () => getOwnerId());
    if (!owner)
      return timing.attach(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );

    const ownerId = owner.ownerId;
    await timing.timeStep("assert_org_scope", () =>
      assertOrgScopeHasDataOrThrow(ownerId),
    );

    const payload = await timing.timeStep("route_cache", () =>
      cacheOwnerRoute({
        namespace: "telemetry-summary",
        ownerId,
        load: async () => {
          const [totals] = await runStep(timing, "telemetry_totals", () =>
            db
              .select({
                totalToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalToolCalls}), 0)`,
                totalSuccessfulToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalSuccessfulToolCalls}), 0)`,
                totalFailedToolCalls: sql<number>`coalesce(sum(${telemetryDaily.totalFailedToolCalls}), 0)`,
                totalDurationMs: sql<number>`coalesce(sum(${telemetryDaily.totalDurationMs}), 0)`,
                totalSessionStarts: sql<number>`coalesce(sum(${telemetryDaily.totalSessionStarts}), 0)`,
                totalSessionEnds: sql<number>`coalesce(sum(${telemetryDaily.totalSessionEnds}), 0)`,
                totalSessionDurationMs: sql<number>`coalesce(sum(${telemetryDaily.totalSessionDurationMs}), 0)`,
                totalSearches: sql<number>`coalesce(sum(${telemetryDaily.totalSearches}), 0)`,
                totalRelatedLookups: sql<number>`coalesce(sum(${telemetryDaily.totalRelatedLookups}), 0)`,
                totalRuleLookups: sql<number>`coalesce(sum(${telemetryDaily.totalRuleLookups}), 0)`,
                totalReloads: sql<number>`coalesce(sum(${telemetryDaily.totalReloads}), 0)`,
                totalCallerLookups: sql<number>`coalesce(sum(${telemetryDaily.totalCallerLookups}), 0)`,
                totalTraceLookups: sql<number>`coalesce(sum(${telemetryDaily.totalTraceLookups}), 0)`,
                totalImpactAnalyses: sql<number>`coalesce(sum(${telemetryDaily.totalImpactAnalyses}), 0)`,
                totalResultsReturned: sql<number>`coalesce(sum(${telemetryDaily.totalResultsReturned}), 0)`,
                totalTokensSaved: sql<number>`coalesce(sum(${telemetryDaily.totalTokensSaved}), 0)`,
                totalTokensTotal: sql<number>`coalesce(sum(${telemetryDaily.totalTokensTotal}), 0)`,
                eventCount: sql<number>`coalesce(sum(${telemetryDaily.pushCount}), 0)`,
              })
              .from(telemetryDaily)
              .where(eq(telemetryDaily.orgId, ownerId)),
          );

          const [activity] = await runStep(timing, "telemetry_activity", () =>
            db
              .select({
                lastTelemetryAt: sql<string>`max(${telemetryEvents.receivedAt})`,
                distinctInstances: sql<number>`count(distinct coalesce(${telemetryEvents.instanceId}, ${telemetryEvents.apiKeyId}::text))`,
              })
              .from(telemetryEvents)
              .where(eq(telemetryEvents.orgId, ownerId)),
          );

          const [policyCount] = await runStep(timing, "policy_count", () =>
            db
              .select({ count: sql<number>`count(*)` })
              .from(policies)
              .where(eq(policies.orgId, ownerId)),
          );

          const daily = await runStep(timing, "telemetry_daily", () =>
            db
              .select({
                date: sql<string>`${telemetryDaily.date}::text`,
                toolCalls: telemetryDaily.totalToolCalls,
                successfulToolCalls: telemetryDaily.totalSuccessfulToolCalls,
                failedToolCalls: telemetryDaily.totalFailedToolCalls,
                totalDurationMs: telemetryDaily.totalDurationMs,
                searches: telemetryDaily.totalSearches,
                relatedLookups: telemetryDaily.totalRelatedLookups,
                ruleLookups: telemetryDaily.totalRuleLookups,
                reloads: telemetryDaily.totalReloads,
                callerLookups: telemetryDaily.totalCallerLookups,
                traceLookups: telemetryDaily.totalTraceLookups,
                impactAnalyses: telemetryDaily.totalImpactAnalyses,
                resultsReturned: telemetryDaily.totalResultsReturned,
                tokensSaved: telemetryDaily.totalTokensSaved,
                tokensTotal: telemetryDaily.totalTokensTotal,
                pushCount: telemetryDaily.pushCount,
              })
              .from(telemetryDaily)
              .where(eq(telemetryDaily.orgId, ownerId))
              .orderBy(desc(telemetryDaily.date))
              .limit(30),
          );

          const versions = await runStep(timing, "telemetry_versions", () =>
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
          );

          const tokensSaved = Number(totals?.totalTokensSaved ?? 0);
          const resultsReturned = Number(totals?.totalResultsReturned ?? 0);
          const reportedTotal = Number(totals?.totalTokensTotal ?? 0);
          const tokensTotal = estimateTotal(
            tokensSaved,
            resultsReturned,
            reportedTotal,
          );

          return {
            boundary: TELEMETRY_RETENTION_POLICY,
            governance: TELEMETRY_GOVERNANCE_GUIDANCE,
            lastTelemetryAt: activity?.lastTelemetryAt ?? null,
            totals: {
              toolCalls: Number(totals?.totalToolCalls ?? 0),
              successfulToolCalls: Number(totals?.totalSuccessfulToolCalls ?? 0),
              failedToolCalls: Number(totals?.totalFailedToolCalls ?? 0),
              totalDurationMs: Number(totals?.totalDurationMs ?? 0),
              sessionStarts: Number(totals?.totalSessionStarts ?? 0),
              sessionEnds: Number(totals?.totalSessionEnds ?? 0),
              sessionDurationMsTotal: Number(totals?.totalSessionDurationMs ?? 0),
              searches: Number(totals?.totalSearches ?? 0),
              relatedLookups: Number(totals?.totalRelatedLookups ?? 0),
              ruleLookups: Number(totals?.totalRuleLookups ?? 0),
              reloads: Number(totals?.totalReloads ?? 0),
              callerLookups: Number(totals?.totalCallerLookups ?? 0),
              traceLookups: Number(totals?.totalTraceLookups ?? 0),
              impactAnalyses: Number(totals?.totalImpactAnalyses ?? 0),
              resultsReturned,
              tokensSaved,
              tokensTotal,
              tokensReported: reportedTotal > 0,
              eventCount: Number(totals?.eventCount ?? 0),
              activeInstances: Number(activity?.distinctInstances ?? 0),
            },
            activePolicies: Number(policyCount?.count ?? 0),
            versions: versions.map((v) => ({
              version: v.version ?? "unknown",
              instances: Number(v.instances),
              lastSeen: v.lastSeen,
            })),
            daily: daily.reverse().map((d) => {
              const saved = Number(d.tokensSaved);
              const results = Number(d.resultsReturned);
              const reported = Number(d.tokensTotal);
              return {
                ...d,
                toolCalls: Number(d.toolCalls),
                successfulToolCalls: Number(d.successfulToolCalls),
                failedToolCalls: Number(d.failedToolCalls),
                totalDurationMs: Number(d.totalDurationMs),
                tokensSaved: saved,
                tokensTotal: estimateTotal(saved, results, reported),
                tokensReported: reported > 0,
                resultsReturned: results,
              };
            }),
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
          },
          { status: 409 },
        ),
      );
    }

    if (error instanceof TelemetrySummaryQueryError) {
      const detail = describeError(error.cause);
      console.error(
        `[telemetry.summary] Failed at ${error.step}: ${detail}`,
        error.cause,
      );
      return timing.attach(
        NextResponse.json(
          {
            code: "telemetry_summary_unavailable",
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
          code: "telemetry_summary_unavailable",
          error: "Failed to load telemetry summary",
          detail: describeError(error),
        },
        { status: 500 },
      ),
    );
  }
}
