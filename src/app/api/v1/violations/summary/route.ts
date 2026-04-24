import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { policies, policyViolations, violationsDaily } from "@/db/schema";
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

  const payload = await timing.timeStep("route_cache", () =>
    cacheOwnerRoute({
      namespace: "violations-summary",
      ownerId,
      load: async () => {
        const [violationTotals] = await timing.timeStep("violation_totals", () =>
          db
            .select({
              total: sql<number>`coalesce(sum(${violationsDaily.totalCount}), 0)`,
              errors: sql<number>`coalesce(sum(${violationsDaily.errorCount}), 0)`,
              warnings: sql<number>`coalesce(sum(${violationsDaily.warningCount}), 0)`,
              info: sql<number>`coalesce(sum(${violationsDaily.infoCount}), 0)`,
            })
            .from(violationsDaily)
            .where(eq(violationsDaily.orgId, ownerId)),
        );

        const byRule = await timing.timeStep("violation_by_rule", () =>
          db
            .select({
              ruleId: policyViolations.ruleId,
              ruleTitle: policies.title,
              policySeverity: policies.severity,
              policyStatus: policies.status,
              count: sql<number>`count(*)`,
              errors: sql<number>`count(*) filter (where ${policyViolations.severity} = 'error')`,
              warnings: sql<number>`count(*) filter (where ${policyViolations.severity} = 'warning')`,
              lastSeen: sql<string>`max(${policyViolations.occurredAt})`,
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
            .groupBy(
              policyViolations.ruleId,
              policies.title,
              policies.severity,
              policies.status,
            )
            .orderBy(desc(sql`count(*)`))
            .limit(20),
        );

        const daily = await timing.timeStep("violation_daily", () =>
          db
            .select({
              date: sql<string>`${violationsDaily.date}::text`,
              total: violationsDaily.totalCount,
              errors: violationsDaily.errorCount,
              warnings: violationsDaily.warningCount,
            })
            .from(violationsDaily)
            .where(eq(violationsDaily.orgId, ownerId))
            .orderBy(desc(violationsDaily.date))
            .limit(30),
        );

        const recent = await timing.timeStep("violation_recent", () =>
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
              filePath: policyViolations.filePath,
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
            .limit(50),
        );

        return {
          severity: {
            error: Number(violationTotals?.errors ?? 0),
            warning: Number(violationTotals?.warnings ?? 0),
            info: Number(violationTotals?.info ?? 0),
          },
          total: Number(violationTotals?.total ?? 0),
          byRule: byRule.map((r) => ({
            ruleId: r.ruleId,
            ruleTitle: r.ruleTitle ?? r.ruleId,
            policySeverity: r.policySeverity ?? null,
            policyStatus: r.policyStatus ?? null,
            count: Number(r.count),
            errors: Number(r.errors),
            warnings: Number(r.warnings),
            lastSeen: r.lastSeen,
          })),
          daily: daily.reverse().map((d) => ({
            date: d.date,
            total: Number(d.total),
            errors: Number(d.errors),
            warnings: Number(d.warnings),
          })),
          recent,
        };
      },
    }),
  );

  return timing.attach(NextResponse.json(payload));
}
