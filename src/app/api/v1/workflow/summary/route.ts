import { NextResponse } from "next/server";
import { db } from "@/db";
import { workflowSnapshots } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getOwnerId } from "@/lib/auth/owner";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  await ensureRuntimeSchema();
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = owner.ownerId;

  const latest = await db
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
    .limit(1);

  const byPhase = await db
    .select({
      phase: workflowSnapshots.phase,
      count: sql<number>`count(*)`,
    })
    .from(workflowSnapshots)
    .where(eq(workflowSnapshots.orgId, ownerId))
    .groupBy(workflowSnapshots.phase)
    .orderBy(desc(sql`count(*)`));

  const recent = await db
    .select({
      repo: workflowSnapshots.repo,
      sessionId: workflowSnapshots.sessionId,
      phase: workflowSnapshots.phase,
      approvalStatus: workflowSnapshots.approvalStatus,
      reviewStatus: workflowSnapshots.reviewStatus,
      receivedAt: workflowSnapshots.receivedAt,
    })
    .from(workflowSnapshots)
    .where(eq(workflowSnapshots.orgId, ownerId))
    .orderBy(desc(workflowSnapshots.receivedAt))
    .limit(20);

  return NextResponse.json({
    latest: latest[0] ?? null,
    byPhase: byPhase.map((row) => ({
      phase: row.phase,
      count: Number(row.count),
    })),
    recent,
  });
}
