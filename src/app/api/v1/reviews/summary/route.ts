import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { policies, reviews, reviewsDaily } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { applyRateLimit } from "@/lib/rate-limit";
import { createRequestTiming } from "@/lib/perf/request-timing";
import { cacheOwnerRoute } from "@/lib/cache/owner-route-cache";

export async function GET(req: Request) {
  const timing = createRequestTiming();
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const { orgId, userId } = await timing.timeStep("resolve_owner", () => auth());
  if (!userId)
    return timing.attach(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

  const ownerId = orgId ?? `personal_${userId}`;

  // Totals (pass vs fail)
  const payload = await timing.timeStep("route_cache", () =>
    cacheOwnerRoute({
      namespace: "reviews-summary",
      ownerId,
      load: async () => {
        const totals = await timing.timeStep("review_totals", () =>
          db
            .select({
              total: sql<number>`coalesce(sum(${reviewsDaily.totalCount}), 0)`,
              passed: sql<number>`coalesce(sum(${reviewsDaily.passedCount}), 0)`,
              failed: sql<number>`coalesce(sum(${reviewsDaily.failedCount}), 0)`,
              errors: sql<number>`coalesce(sum(${reviewsDaily.errorCount}), 0)`,
              warnings: sql<number>`coalesce(sum(${reviewsDaily.warningCount}), 0)`,
            })
            .from(reviewsDaily)
            .where(eq(reviewsDaily.orgId, ownerId)),
        );

        const totalsRow = totals[0] ?? { total: 0, passed: 0, failed: 0, errors: 0, warnings: 0 };
        const total = Number(totalsRow.total);
        const passed = Number(totalsRow.passed);
        const failed = Number(totalsRow.failed);
        const complianceScore =
          total > 0 ? Math.round((passed / total) * 1000) / 10 : null;

        const byPolicy = await timing.timeStep("review_by_policy", () =>
          db
            .select({
              policyId: reviews.policyId,
              policyTitle: policies.title,
              policySeverity: policies.severity,
              policyStatus: policies.status,
              count: sql<number>`count(*)`,
              passed: sql<number>`count(*) filter (where ${reviews.pass} = true)`,
              failed: sql<number>`count(*) filter (where ${reviews.pass} = false)`,
              errors: sql<number>`count(*) filter (where ${reviews.pass} = false and ${reviews.severity} = 'error')`,
              lastSeen: sql<string>`max(${reviews.reviewedAt})`,
            })
            .from(reviews)
            .leftJoin(
              policies,
              and(eq(policies.orgId, ownerId), eq(policies.ruleId, reviews.policyId)),
            )
            .where(eq(reviews.orgId, ownerId))
            .groupBy(reviews.policyId, policies.title, policies.severity, policies.status)
            .orderBy(desc(sql`count(*)`))
            .limit(20),
        );

        const daily = await timing.timeStep("review_daily", () =>
          db
            .select({
              date: sql<string>`${reviewsDaily.date}::text`,
              total: reviewsDaily.totalCount,
              passed: reviewsDaily.passedCount,
              failed: reviewsDaily.failedCount,
            })
            .from(reviewsDaily)
            .where(eq(reviewsDaily.orgId, ownerId))
            .orderBy(desc(reviewsDaily.date))
            .limit(30),
        );

        const recent = await timing.timeStep("review_recent", () =>
          db
            .select({
              id: reviews.id,
              repo: reviews.repo,
              policyId: reviews.policyId,
              policyTitle: policies.title,
              policySeverity: policies.severity,
              policyStatus: policies.status,
              pass: reviews.pass,
              severity: reviews.severity,
              message: reviews.message,
              detail: reviews.detail,
              reviewedAt: reviews.reviewedAt,
            })
            .from(reviews)
            .leftJoin(
              policies,
              and(eq(policies.orgId, ownerId), eq(policies.ruleId, reviews.policyId)),
            )
            .where(eq(reviews.orgId, ownerId))
            .orderBy(desc(reviews.reviewedAt))
            .limit(50),
        );

        return {
          total,
          passed,
          failed,
          errors: Number(totalsRow.errors),
          warnings: Number(totalsRow.warnings),
          complianceScore,
          byPolicy: byPolicy.map((p) => ({
            policyId: p.policyId,
            policyTitle: p.policyTitle ?? p.policyId,
            policySeverity: p.policySeverity ?? null,
            policyStatus: p.policyStatus ?? null,
            count: Number(p.count),
            passed: Number(p.passed),
            failed: Number(p.failed),
            errors: Number(p.errors),
            lastSeen: p.lastSeen,
          })),
          daily: daily.reverse().map((d) => ({
            date: d.date,
            total: Number(d.total),
            passed: Number(d.passed),
            failed: Number(d.failed),
          })),
          recent,
        };
      },
    }),
  );

  return timing.attach(NextResponse.json(payload));
}
