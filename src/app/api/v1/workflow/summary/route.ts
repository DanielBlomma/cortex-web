import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workflowSessions, workflowSnapshots } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { applyRateLimit } from "@/lib/rate-limit";
import { createRequestTiming } from "@/lib/perf/request-timing";
import { cacheOwnerRoute } from "@/lib/cache/owner-route-cache";

export async function GET(req: Request) {
  const timing = createRequestTiming();
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const { orgId, userId } = await timing.timeStep("resolve_owner", () => auth());
  if (!userId) {
    return timing.attach(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
  }

  const ownerId = orgId ?? `personal_${userId}`;

  const payload = await timing.timeStep("route_cache", () =>
    cacheOwnerRoute({
      namespace: "workflow-summary",
      ownerId,
      load: async () => {
        const latest = await timing.timeStep("workflow_latest", () =>
          db
            .select({
              repo: workflowSnapshots.repo,
              instanceId: workflowSnapshots.instanceId,
              sessionId: workflowSnapshots.sessionId,
              phase: workflowSnapshots.phase,
              approvalStatus: workflowSnapshots.approvalStatus,
              planStatus: workflowSnapshots.planStatus,
              reviewStatus: workflowSnapshots.reviewStatus,
              blockedReasons: workflowSnapshots.blockedReasons,
              snapshot: workflowSnapshots.snapshot,
              receivedAt: workflowSnapshots.receivedAt,
            })
            .from(workflowSnapshots)
            .where(eq(workflowSnapshots.orgId, ownerId))
            .orderBy(desc(workflowSnapshots.receivedAt))
            .limit(1),
        );

        const byPhase = await timing.timeStep("workflow_by_phase", () =>
          db
            .select({
              phase: workflowSessions.phase,
              count: sql<number>`count(*)`,
            })
            .from(workflowSessions)
            .where(eq(workflowSessions.orgId, ownerId))
            .groupBy(workflowSessions.phase)
            .orderBy(desc(sql`count(*)`)),
        );

        const recent = await timing.timeStep("workflow_recent", () =>
          db
            .select({
              repo: workflowSessions.repo,
              sessionId: workflowSessions.sessionId,
              phase: workflowSessions.phase,
              approvalStatus: workflowSessions.approvalStatus,
              reviewStatus: workflowSessions.reviewStatus,
              receivedAt: workflowSessions.lastReceivedAt,
            })
            .from(workflowSessions)
            .where(eq(workflowSessions.orgId, ownerId))
            .orderBy(desc(workflowSessions.lastReceivedAt))
            .limit(20),
        );

        return {
          latest: latest[0] ?? null,
          byPhase: byPhase.map((row) => ({
            phase: row.phase,
            count: Number(row.count),
          })),
          recent,
        };
      },
    }),
  );

  return timing.attach(NextResponse.json(payload));
}
