import { NextResponse } from "next/server";
import { db } from "@/db";
import { policyViolations } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getOwnerId } from "@/lib/auth/owner";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = owner.ownerId;

  // Totals by severity
  const bySeverity = await db
    .select({
      severity: policyViolations.severity,
      count: sql<number>`count(*)`,
    })
    .from(policyViolations)
    .where(eq(policyViolations.orgId, ownerId))
    .groupBy(policyViolations.severity);

  const severityCounts: Record<string, number> = { error: 0, warning: 0, info: 0 };
  for (const row of bySeverity) {
    severityCounts[row.severity] = Number(row.count);
  }

  // Top violated rules
  const byRule = await db
    .select({
      ruleId: policyViolations.ruleId,
      count: sql<number>`count(*)`,
      errors: sql<number>`count(*) filter (where ${policyViolations.severity} = 'error')`,
      warnings: sql<number>`count(*) filter (where ${policyViolations.severity} = 'warning')`,
      lastSeen: sql<string>`max(${policyViolations.occurredAt})`,
    })
    .from(policyViolations)
    .where(eq(policyViolations.orgId, ownerId))
    .groupBy(policyViolations.ruleId)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  // Daily breakdown (last 30 days)
  const daily = await db
    .select({
      date: sql<string>`date(${policyViolations.occurredAt} at time zone 'UTC')`,
      total: sql<number>`count(*)`,
      errors: sql<number>`count(*) filter (where ${policyViolations.severity} = 'error')`,
      warnings: sql<number>`count(*) filter (where ${policyViolations.severity} = 'warning')`,
    })
    .from(policyViolations)
    .where(eq(policyViolations.orgId, ownerId))
    .groupBy(sql`date(${policyViolations.occurredAt} at time zone 'UTC')`)
    .orderBy(desc(sql`date(${policyViolations.occurredAt} at time zone 'UTC')`))
    .limit(30);

  // Recent violations
  const recent = await db
    .select({
      id: policyViolations.id,
      repo: policyViolations.repo,
      ruleId: policyViolations.ruleId,
      severity: policyViolations.severity,
      message: policyViolations.message,
      filePath: policyViolations.filePath,
      occurredAt: policyViolations.occurredAt,
    })
    .from(policyViolations)
    .where(eq(policyViolations.orgId, ownerId))
    .orderBy(desc(policyViolations.occurredAt))
    .limit(50);

  return NextResponse.json({
    severity: severityCounts,
    total: Object.values(severityCounts).reduce((a, b) => a + b, 0),
    byRule: byRule.map((r) => ({
      ruleId: r.ruleId,
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
  });
}
