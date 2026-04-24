import { NextResponse } from "next/server";
import { db } from "@/db";
import { telemetryEvents, policies } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import {
  assertOrgScopeHasDataOrThrow,
  OrgScopeMismatchError,
} from "@/lib/org-scope";
import { TELEMETRY_RETENTION_POLICY } from "@/lib/telemetry/retention";
import { applyRateLimit } from "@/lib/rate-limit";
import { getOwnerId } from "@/lib/auth/owner";

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

async function runStep<T>(step: string, query: () => Promise<T>): Promise<T> {
  try {
    return await query();
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
  try {
    const rl = applyRateLimit(req, 30);
    if (rl) return rl;

    const owner = await getOwnerId();
    if (!owner)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ownerId = owner.ownerId;
    await ensureRuntimeSchema();
    await assertOrgScopeHasDataOrThrow(ownerId);

    // Aggregate totals from telemetry_events
    const [totals] = await runStep("telemetry_totals", () =>
      db
        .select({
          totalToolCalls: sql<number>`coalesce(sum(${telemetryEvents.totalToolCalls}), 0)`,
          totalSuccessfulToolCalls: sql<number>`coalesce(sum(${telemetryEvents.successfulToolCalls}), 0)`,
          totalFailedToolCalls: sql<number>`coalesce(sum(${telemetryEvents.failedToolCalls}), 0)`,
          totalDurationMs: sql<number>`coalesce(sum(${telemetryEvents.totalDurationMs}), 0)`,
          totalSessionStarts: sql<number>`coalesce(sum(${telemetryEvents.sessionStarts}), 0)`,
          totalSessionEnds: sql<number>`coalesce(sum(${telemetryEvents.sessionEnds}), 0)`,
          totalSessionDurationMs: sql<number>`coalesce(sum(${telemetryEvents.sessionDurationMsTotal}), 0)`,
          totalSearches: sql<number>`coalesce(sum(${telemetryEvents.searches}), 0)`,
          totalRelatedLookups: sql<number>`coalesce(sum(${telemetryEvents.relatedLookups}), 0)`,
          totalRuleLookups: sql<number>`coalesce(sum(${telemetryEvents.ruleLookups}), 0)`,
          totalReloads: sql<number>`coalesce(sum(${telemetryEvents.reloads}), 0)`,
          totalCallerLookups: sql<number>`coalesce(sum(${telemetryEvents.callerLookups}), 0)`,
          totalTraceLookups: sql<number>`coalesce(sum(${telemetryEvents.traceLookups}), 0)`,
          totalImpactAnalyses: sql<number>`coalesce(sum(${telemetryEvents.impactAnalyses}), 0)`,
          totalResultsReturned: sql<number>`coalesce(sum(${telemetryEvents.totalResultsReturned}), 0)`,
          totalTokensSaved: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensSaved}), 0)`,
          totalTokensTotal: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensTotal}), 0)`,
          eventCount: sql<number>`count(*)`,
          distinctInstances: sql<number>`count(distinct coalesce(${telemetryEvents.instanceId}, ${telemetryEvents.apiKeyId}::text))`,
        })
        .from(telemetryEvents)
        .where(eq(telemetryEvents.orgId, ownerId)),
    );

    // Active policies count
    const [policyCount] = await runStep("policy_count", () =>
      db
        .select({ count: sql<number>`count(*)` })
        .from(policies)
        .where(eq(policies.orgId, ownerId)),
    );

    // Daily breakdown (last 30 days) from telemetry_events
    const daily = await runStep("telemetry_daily", () =>
      db
        .select({
          date: sql<string>`date(${telemetryEvents.periodStart} at time zone 'UTC')`,
          toolCalls: sql<number>`coalesce(sum(${telemetryEvents.totalToolCalls}), 0)`,
          successfulToolCalls: sql<number>`coalesce(sum(${telemetryEvents.successfulToolCalls}), 0)`,
          failedToolCalls: sql<number>`coalesce(sum(${telemetryEvents.failedToolCalls}), 0)`,
          totalDurationMs: sql<number>`coalesce(sum(${telemetryEvents.totalDurationMs}), 0)`,
          searches: sql<number>`coalesce(sum(${telemetryEvents.searches}), 0)`,
          relatedLookups: sql<number>`coalesce(sum(${telemetryEvents.relatedLookups}), 0)`,
          ruleLookups: sql<number>`coalesce(sum(${telemetryEvents.ruleLookups}), 0)`,
          reloads: sql<number>`coalesce(sum(${telemetryEvents.reloads}), 0)`,
          callerLookups: sql<number>`coalesce(sum(${telemetryEvents.callerLookups}), 0)`,
          traceLookups: sql<number>`coalesce(sum(${telemetryEvents.traceLookups}), 0)`,
          impactAnalyses: sql<number>`coalesce(sum(${telemetryEvents.impactAnalyses}), 0)`,
          resultsReturned: sql<number>`coalesce(sum(${telemetryEvents.totalResultsReturned}), 0)`,
          tokensSaved: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensSaved}), 0)`,
          tokensTotal: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensTotal}), 0)`,
          pushCount: sql<number>`count(*)`,
        })
        .from(telemetryEvents)
        .where(eq(telemetryEvents.orgId, ownerId))
        .groupBy(sql`date(${telemetryEvents.periodStart} at time zone 'UTC')`)
        .orderBy(desc(sql`date(${telemetryEvents.periodStart} at time zone 'UTC')`))
        .limit(30),
    );

    // Distinct client versions with last-seen timestamp
    const versions = await runStep("telemetry_versions", () =>
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

    return NextResponse.json({
      boundary: TELEMETRY_RETENTION_POLICY,
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
        activeInstances: Number(totals?.distinctInstances ?? 0),
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
          resultsReturned: results,
        };
      }),
    });
  } catch (error) {
    if (error instanceof OrgScopeMismatchError) {
      return NextResponse.json(
        {
          code: "org_scope_mismatch",
          error: error.message,
          ownerId: error.ownerId,
        },
        { status: 409 },
      );
    }

    if (error instanceof TelemetrySummaryQueryError) {
      const detail = describeError(error.cause);
      console.error(
        `[telemetry.summary] Failed at ${error.step}: ${detail}`,
        error.cause,
      );
      return NextResponse.json(
        {
          code: "telemetry_summary_unavailable",
          error: error.message,
          step: error.step,
          detail,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        code: "telemetry_summary_unavailable",
        error: "Failed to load telemetry summary",
        detail: describeError(error),
      },
      { status: 500 },
    );
  }
}
