import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  auditLog,
  policies,
  apiKeys,
  policyViolations,
  telemetryEvents,
} from "@/db/schema";
import { eq, sql, and, gte, lte, isNull, desc } from "drizzle-orm";
import { getOwnerId } from "@/lib/auth/owner";
import { logAudit } from "@/lib/audit/log";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const rl = applyRateLimit(req, 5);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query parameters are required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T23:59:59Z`);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const ownerId = owner.ownerId;

  // 1. Policy governance
  const activePolicies = await db
    .select({
      id: policies.id,
      ruleId: policies.ruleId,
      description: policies.description,
      priority: policies.priority,
      scope: policies.scope,
      enforce: policies.enforce,
      createdAt: policies.createdAt,
      updatedAt: policies.updatedAt,
    })
    .from(policies)
    .where(eq(policies.orgId, ownerId))
    .orderBy(policies.priority);

  // 2. API key inventory
  const allKeys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.orgId, ownerId))
    .orderBy(apiKeys.createdAt);

  const activeKeys = allKeys.filter((k) => !k.revokedAt);
  const revokedKeysInPeriod = allKeys.filter(
    (k) => k.revokedAt && k.revokedAt >= fromDate && k.revokedAt <= toDate
  );

  // 3. Violations in period
  const [violationTotals] = await db
    .select({
      total: sql<number>`count(*)`,
      errors: sql<number>`count(*) filter (where ${policyViolations.severity} = 'error')`,
      warnings: sql<number>`count(*) filter (where ${policyViolations.severity} = 'warning')`,
      info: sql<number>`count(*) filter (where ${policyViolations.severity} = 'info')`,
    })
    .from(policyViolations)
    .where(
      and(
        eq(policyViolations.orgId, ownerId),
        gte(policyViolations.occurredAt, fromDate),
        lte(policyViolations.occurredAt, toDate)
      )
    );

  const violationsByRule = await db
    .select({
      ruleId: policyViolations.ruleId,
      count: sql<number>`count(*)`,
      errors: sql<number>`count(*) filter (where ${policyViolations.severity} = 'error')`,
      warnings: sql<number>`count(*) filter (where ${policyViolations.severity} = 'warning')`,
    })
    .from(policyViolations)
    .where(
      and(
        eq(policyViolations.orgId, ownerId),
        gte(policyViolations.occurredAt, fromDate),
        lte(policyViolations.occurredAt, toDate)
      )
    )
    .groupBy(policyViolations.ruleId)
    .orderBy(desc(sql`count(*)`));

  // 4. Telemetry summary for period
  const [telemetry] = await db
    .select({
      searches: sql<number>`coalesce(sum(${telemetryEvents.searches}), 0)`,
      tokensSaved: sql<number>`coalesce(sum(${telemetryEvents.estimatedTokensSaved}), 0)`,
      resultsReturned: sql<number>`coalesce(sum(${telemetryEvents.totalResultsReturned}), 0)`,
      pushCount: sql<number>`count(*)`,
      distinctInstances: sql<number>`count(distinct coalesce(${telemetryEvents.instanceId}, ${telemetryEvents.apiKeyId}::text))`,
    })
    .from(telemetryEvents)
    .where(
      and(
        eq(telemetryEvents.orgId, ownerId),
        gte(telemetryEvents.periodStart, fromDate),
        lte(telemetryEvents.periodStart, toDate)
      )
    );

  // 5. Audit trail for period
  const auditEntries = await db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      description: auditLog.description,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.orgId, ownerId),
        gte(auditLog.createdAt, fromDate),
        lte(auditLog.createdAt, toDate)
      )
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(500);

  logAudit({
    orgId: ownerId,
    userId: owner.userId,
    action: "export",
    resourceType: "report",
    description: `Exported compliance report ${from} to ${to}`,
    req,
  });

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      periodFrom: from,
      periodTo: to,
      orgId: ownerId,
      framework: ["ISO 27001", "SOC 2 Type II"],
    },

    // ISO 27001 A.5 / SOC 2 CC1 — Information Security Policies
    policyGovernance: {
      totalActivePolicies: activePolicies.length,
      enforcedPolicies: activePolicies.filter((p) => p.enforce).length,
      disabledPolicies: activePolicies.filter((p) => !p.enforce).length,
      policies: activePolicies,
    },

    // ISO 27001 A.9 / SOC 2 CC6 — Access Control
    accessControl: {
      totalActiveKeys: activeKeys.length,
      keysRevokedInPeriod: revokedKeysInPeriod.length,
      apiKeys: allKeys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.keyPrefix,
        scopes: k.scopes,
        status: k.revokedAt ? "revoked" : "active",
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        revokedAt: k.revokedAt,
      })),
    },

    // ISO 27001 A.12.4 / SOC 2 CC7 — Logging & Monitoring
    violations: {
      total: Number(violationTotals?.total ?? 0),
      errors: Number(violationTotals?.errors ?? 0),
      warnings: Number(violationTotals?.warnings ?? 0),
      info: Number(violationTotals?.info ?? 0),
      byRule: violationsByRule.map((r) => ({
        ruleId: r.ruleId,
        count: Number(r.count),
        errors: Number(r.errors),
        warnings: Number(r.warnings),
      })),
    },

    // ISO 27001 A.12.4.1 / SOC 2 CC7.2 — Audit Trail
    auditTrail: {
      totalEvents: auditEntries.length,
      events: auditEntries,
    },

    // System Usage
    telemetry: {
      totalSearches: Number(telemetry?.searches ?? 0),
      totalTokensSaved: Number(telemetry?.tokensSaved ?? 0),
      totalResultsReturned: Number(telemetry?.resultsReturned ?? 0),
      telemetryPushes: Number(telemetry?.pushCount ?? 0),
      activeInstances: Number(telemetry?.distinctInstances ?? 0),
    },
  };

  return NextResponse.json(report);
}
