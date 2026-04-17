import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
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

  // Totals (pass vs fail)
  const totals = await db
    .select({
      total: sql<number>`count(*)`,
      passed: sql<number>`count(*) filter (where ${reviews.pass} = true)`,
      failed: sql<number>`count(*) filter (where ${reviews.pass} = false)`,
      errors: sql<number>`count(*) filter (where ${reviews.pass} = false and ${reviews.severity} = 'error')`,
      warnings: sql<number>`count(*) filter (where ${reviews.pass} = false and ${reviews.severity} = 'warning')`,
    })
    .from(reviews)
    .where(eq(reviews.orgId, ownerId));

  const totalsRow = totals[0] ?? { total: 0, passed: 0, failed: 0, errors: 0, warnings: 0 };
  const total = Number(totalsRow.total);
  const passed = Number(totalsRow.passed);
  const failed = Number(totalsRow.failed);
  const complianceScore = total > 0 ? Math.round((passed / total) * 1000) / 10 : null;

  // Per-policy breakdown
  const byPolicy = await db
    .select({
      policyId: reviews.policyId,
      count: sql<number>`count(*)`,
      passed: sql<number>`count(*) filter (where ${reviews.pass} = true)`,
      failed: sql<number>`count(*) filter (where ${reviews.pass} = false)`,
      errors: sql<number>`count(*) filter (where ${reviews.pass} = false and ${reviews.severity} = 'error')`,
      lastSeen: sql<string>`max(${reviews.reviewedAt})`,
    })
    .from(reviews)
    .where(eq(reviews.orgId, ownerId))
    .groupBy(reviews.policyId)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  // Daily breakdown (last 30 days)
  const daily = await db
    .select({
      date: sql<string>`date(${reviews.reviewedAt} at time zone 'UTC')`,
      total: sql<number>`count(*)`,
      passed: sql<number>`count(*) filter (where ${reviews.pass} = true)`,
      failed: sql<number>`count(*) filter (where ${reviews.pass} = false)`,
    })
    .from(reviews)
    .where(eq(reviews.orgId, ownerId))
    .groupBy(sql`date(${reviews.reviewedAt} at time zone 'UTC')`)
    .orderBy(desc(sql`date(${reviews.reviewedAt} at time zone 'UTC')`))
    .limit(30);

  // Recent reviews
  const recent = await db
    .select({
      id: reviews.id,
      repo: reviews.repo,
      policyId: reviews.policyId,
      pass: reviews.pass,
      severity: reviews.severity,
      message: reviews.message,
      detail: reviews.detail,
      reviewedAt: reviews.reviewedAt,
    })
    .from(reviews)
    .where(eq(reviews.orgId, ownerId))
    .orderBy(desc(reviews.reviewedAt))
    .limit(50);

  return NextResponse.json({
    total,
    passed,
    failed,
    errors: Number(totalsRow.errors),
    warnings: Number(totalsRow.warnings),
    complianceScore,
    byPolicy: byPolicy.map((p) => ({
      policyId: p.policyId,
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
  });
}
