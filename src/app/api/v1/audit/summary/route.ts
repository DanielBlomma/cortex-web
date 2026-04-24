import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditDaily, auditLog } from "@/db/schema";
import { AUDIT_RETENTION_POLICY } from "@/lib/audit/retention";
import { applyRateLimit } from "@/lib/rate-limit";
import { createRequestTiming } from "@/lib/perf/request-timing";
import { cacheOwnerRoute } from "@/lib/cache/owner-route-cache";

type MetadataValue = Record<string, unknown> | null;

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnlyEnd(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseMetadata(raw: string | null): MetadataValue {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

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

  const { searchParams } = new URL(req.url);
  const from = parseDateOnly(searchParams.get("from"));
  const to = parseDateOnlyEnd(searchParams.get("to"));
  const source = searchParams.get("source");
  const eventType = searchParams.get("event_type");
  const evidenceLevel = searchParams.get("evidence_level");
  const resourceType = searchParams.get("resource_type");
  const sessionId = searchParams.get("session_id");
  const search = searchParams.get("search")?.trim();
  const limitRaw = Number(searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, 500))
    : 100;
  const queryKey = new URL(req.url).searchParams.toString();

  if ((searchParams.get("from") && !from) || (searchParams.get("to") && !to)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const filters = [
    eq(auditLog.orgId, ownerId),
    from ? gte(auditLog.occurredAt, from) : undefined,
    to ? lte(auditLog.occurredAt, to) : undefined,
    source ? eq(auditLog.source, source) : undefined,
    eventType ? eq(auditLog.eventType, eventType) : undefined,
    evidenceLevel ? eq(auditLog.evidenceLevel, evidenceLevel) : undefined,
    resourceType ? eq(auditLog.resourceType, resourceType) : undefined,
    sessionId ? eq(auditLog.sessionId, sessionId) : undefined,
    search
      ? or(
          ilike(auditLog.description, `%${search}%`),
          ilike(auditLog.action, `%${search}%`),
          ilike(auditLog.resourceType, `%${search}%`),
          ilike(auditLog.repo, `%${search}%`),
          ilike(auditLog.metadata, `%${search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const canUseAuditDailyTotals =
    !from &&
    !to &&
    !resourceType &&
    !sessionId &&
    !search &&
    source === null &&
    eventType === null &&
    evidenceLevel === null;

  const payload = await timing.timeStep("route_cache", () =>
    cacheOwnerRoute({
      namespace: "audit-summary",
      ownerId,
      cacheKeyParts: [queryKey],
      load: async () => {
        const [totals] = canUseAuditDailyTotals
          ? await timing.timeStep("audit_totals_daily", () =>
              db
                .select({
                  total: sql<number>`coalesce(sum(${auditDaily.totalCount}), 0)`,
                  required: sql<number>`coalesce(sum(${auditDaily.requiredCount}), 0)`,
                  diagnostic: sql<number>`coalesce(sum(${auditDaily.diagnosticCount}), 0)`,
                  client: sql<number>`coalesce(sum(${auditDaily.clientCount}), 0)`,
                  web: sql<number>`coalesce(sum(${auditDaily.webCount}), 0)`,
                })
                .from(auditDaily)
                .where(eq(auditDaily.orgId, ownerId)),
            )
          : await timing.timeStep("audit_totals_raw", () =>
              db
                .select({
                  total: sql<number>`count(*)`,
                  required: sql<number>`count(*) filter (where ${auditLog.evidenceLevel} = 'required')`,
                  diagnostic: sql<number>`count(*) filter (where ${auditLog.evidenceLevel} = 'diagnostic')`,
                  client: sql<number>`count(*) filter (where ${auditLog.source} = 'client')`,
                  web: sql<number>`count(*) filter (where ${auditLog.source} = 'web')`,
                })
                .from(auditLog)
                .where(whereClause),
            );

        const byEventType = await timing.timeStep("audit_by_event_type", () =>
          db
            .select({
              eventType: sql<string>`coalesce(${auditLog.eventType}, 'unknown')`,
              count: sql<number>`count(*)`,
            })
            .from(auditLog)
            .where(whereClause)
            .groupBy(auditLog.eventType)
            .orderBy(desc(sql`count(*)`)),
        );

        const rows = await timing.timeStep("audit_recent", () =>
          db
            .select({
              id: auditLog.id,
              source: auditLog.source,
              action: auditLog.action,
              eventType: auditLog.eventType,
              evidenceLevel: auditLog.evidenceLevel,
              resourceType: auditLog.resourceType,
              resourceId: auditLog.resourceId,
              repo: auditLog.repo,
              sessionId: auditLog.sessionId,
              instanceId: auditLog.instanceId,
              description: auditLog.description,
              metadata: auditLog.metadata,
              occurredAt: auditLog.occurredAt,
              createdAt: auditLog.createdAt,
            })
            .from(auditLog)
            .where(whereClause)
            .orderBy(desc(auditLog.occurredAt), desc(auditLog.createdAt))
            .limit(limit),
        );

        return {
          retention: AUDIT_RETENTION_POLICY,
          totals: {
            total: Number(totals?.total ?? 0),
            required: Number(totals?.required ?? 0),
            diagnostic: Number(totals?.diagnostic ?? 0),
            client: Number(totals?.client ?? 0),
            web: Number(totals?.web ?? 0),
          },
          byEventType: byEventType.map((row) => ({
            eventType: row.eventType,
            count: Number(row.count),
          })),
          events: rows.map((row) => ({
            ...row,
            metadata: parseMetadata(row.metadata),
          })),
        };
      },
    }),
  );

  return timing.attach(NextResponse.json(payload));
}
