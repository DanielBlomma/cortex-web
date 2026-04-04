import { NextResponse } from "next/server";
import { db } from "@/db";
import { telemetryEvents, policies } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getOwnerId } from "@/lib/auth/owner";
import { applyRateLimit } from "@/lib/rate-limit";

// Average tokens per context result — used to estimate total token cost
// when enterprise hasn't sent estimated_tokens_total yet.
const AVG_TOKENS_PER_RESULT = 400;

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
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = owner.ownerId;

  // Aggregate totals from telemetry_events
  const [totals] = await db
    .select({
      totalSearches: sql<number>`coalesce(sum(${telemetryEvents.searches}), 0)`,
      totalRelatedLookups: sql<number>`coalesce(sum(${telemetryEvents.relatedLookups}), 0)`,
      totalRuleLookups: sql<number>`coalesce(sum(${telemetryEvents.ruleLookups}), 0)`,
      totalReloads: sql<number>`coalesce(sum(${telemetryEvents.reloads}), 0)`,
      totalResultsReturned: sql<number>`coalesce(sum(${telemetryEvents.totalResultsReturned}), 0)`,
      totalTokensSaved: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensSaved}), 0)`,
      totalTokensTotal: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensTotal}), 0)`,
      eventCount: sql<number>`count(*)`,
      distinctInstances: sql<number>`count(distinct ${telemetryEvents.apiKeyId})`,
    })
    .from(telemetryEvents)
    .where(eq(telemetryEvents.orgId, ownerId));

  // Active policies count
  const [policyCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(policies)
    .where(eq(policies.orgId, ownerId));

  // Daily breakdown (last 30 days) from telemetry_events
  const daily = await db
    .select({
      date: sql<string>`date(${telemetryEvents.periodStart} at time zone 'UTC')`,
      searches: sql<number>`coalesce(sum(${telemetryEvents.searches}), 0)`,
      relatedLookups: sql<number>`coalesce(sum(${telemetryEvents.relatedLookups}), 0)`,
      ruleLookups: sql<number>`coalesce(sum(${telemetryEvents.ruleLookups}), 0)`,
      reloads: sql<number>`coalesce(sum(${telemetryEvents.reloads}), 0)`,
      resultsReturned: sql<number>`coalesce(sum(${telemetryEvents.totalResultsReturned}), 0)`,
      tokensSaved: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensSaved}), 0)`,
      tokensTotal: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensTotal}), 0)`,
      pushCount: sql<number>`count(*)`,
    })
    .from(telemetryEvents)
    .where(eq(telemetryEvents.orgId, ownerId))
    .groupBy(sql`date(${telemetryEvents.periodStart} at time zone 'UTC')`)
    .orderBy(desc(sql`date(${telemetryEvents.periodStart} at time zone 'UTC')`))
    .limit(30);

  const tokensSaved = Number(totals?.totalTokensSaved ?? 0);
  const resultsReturned = Number(totals?.totalResultsReturned ?? 0);
  const reportedTotal = Number(totals?.totalTokensTotal ?? 0);
  const tokensTotal = estimateTotal(tokensSaved, resultsReturned, reportedTotal);

  return NextResponse.json({
    totals: {
      searches: Number(totals?.totalSearches ?? 0),
      relatedLookups: Number(totals?.totalRelatedLookups ?? 0),
      ruleLookups: Number(totals?.totalRuleLookups ?? 0),
      reloads: Number(totals?.totalReloads ?? 0),
      resultsReturned,
      tokensSaved,
      tokensTotal,
      eventCount: Number(totals?.eventCount ?? 0),
      activeInstances: Number(totals?.distinctInstances ?? 0),
    },
    activePolicies: Number(policyCount?.count ?? 0),
    daily: daily.reverse().map((d) => {
      const saved = Number(d.tokensSaved);
      const results = Number(d.resultsReturned);
      const reported = Number(d.tokensTotal);
      return {
        ...d,
        tokensSaved: saved,
        tokensTotal: estimateTotal(saved, results, reported),
        resultsReturned: results,
      };
    }),
  });
}
