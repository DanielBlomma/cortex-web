import { NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  hostEnrollment,
  hookTamperEvent,
  ungovernedSessionEvent,
  managedSettingsAudit,
} from "@/db/schema";
import { applyRateLimit } from "@/lib/rate-limit";
import { getOwnerId } from "@/lib/auth/owner";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";

/**
 * GET /api/v1/govern/overview
 *
 * Aggregates the data the /dashboard/govern page renders:
 *  - compliance health (host count by govern_mode)
 *  - hosts table (one row per enrolled host with current state)
 *  - 7d activity counts (tamper, ungoverned, sync results)
 *  - recent events (latest 50, mixed types)
 *
 * Auth: Clerk session (dashboard page calls this via cookie). Org-scoped
 * to the caller's ownerId.
 */
export async function GET(req: Request) {
  await ensureRuntimeSchema();
  const rl = applyRateLimit(req, 60);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [hosts, modeCounts, ungovernedCount, tamperCount, applyCount, recentTamper, recentUngov, recentApply] =
    await Promise.all([
      db
        .select({
          hostId: hostEnrollment.hostId,
          os: hostEnrollment.os,
          osVersion: hostEnrollment.osVersion,
          governMode: hostEnrollment.governMode,
          aiClisDetected: hostEnrollment.aiClisDetected,
          activeFrameworks: hostEnrollment.activeFrameworks,
          configVersion: hostEnrollment.configVersion,
          firstSeen: hostEnrollment.firstSeen,
          lastSeen: hostEnrollment.lastSeen,
        })
        .from(hostEnrollment)
        .where(eq(hostEnrollment.orgId, owner.ownerId))
        .orderBy(desc(hostEnrollment.lastSeen)),

      db
        .select({
          mode: hostEnrollment.governMode,
          count: sql<number>`count(*)::int`,
        })
        .from(hostEnrollment)
        .where(eq(hostEnrollment.orgId, owner.ownerId))
        .groupBy(hostEnrollment.governMode),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(ungovernedSessionEvent)
        .where(
          and(
            eq(ungovernedSessionEvent.orgId, owner.ownerId),
            gte(ungovernedSessionEvent.detectedAt, sevenDaysAgo),
          ),
        ),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(hookTamperEvent)
        .where(
          and(
            eq(hookTamperEvent.orgId, owner.ownerId),
            gte(hookTamperEvent.detectedAt, sevenDaysAgo),
          ),
        ),

      db
        .select({
          success: managedSettingsAudit.success,
          count: sql<number>`count(*)::int`,
        })
        .from(managedSettingsAudit)
        .where(
          and(
            eq(managedSettingsAudit.orgId, owner.ownerId),
            gte(managedSettingsAudit.appliedAt, sevenDaysAgo),
          ),
        )
        .groupBy(managedSettingsAudit.success),

      db
        .select({
          id: hookTamperEvent.id,
          hostId: hookTamperEvent.hostId,
          cli: hookTamperEvent.cli,
          hookName: hookTamperEvent.hookName,
          lastSeen: hookTamperEvent.lastSeen,
          detectedAt: hookTamperEvent.detectedAt,
          resolvedAt: hookTamperEvent.resolvedAt,
        })
        .from(hookTamperEvent)
        .where(
          and(
            eq(hookTamperEvent.orgId, owner.ownerId),
            gte(hookTamperEvent.detectedAt, sevenDaysAgo),
          ),
        )
        .orderBy(desc(hookTamperEvent.detectedAt))
        .limit(20),

      db
        .select({
          id: ungovernedSessionEvent.id,
          hostId: ungovernedSessionEvent.hostId,
          cli: ungovernedSessionEvent.cli,
          binaryPath: ungovernedSessionEvent.binaryPath,
          sysUser: ungovernedSessionEvent.sysUser,
          actionTaken: ungovernedSessionEvent.actionTaken,
          detectedAt: ungovernedSessionEvent.detectedAt,
        })
        .from(ungovernedSessionEvent)
        .where(
          and(
            eq(ungovernedSessionEvent.orgId, owner.ownerId),
            gte(ungovernedSessionEvent.detectedAt, sevenDaysAgo),
          ),
        )
        .orderBy(desc(ungovernedSessionEvent.detectedAt))
        .limit(20),

      db
        .select({
          id: managedSettingsAudit.id,
          hostId: managedSettingsAudit.hostId,
          cli: managedSettingsAudit.cli,
          version: managedSettingsAudit.version,
          source: managedSettingsAudit.source,
          success: managedSettingsAudit.success,
          errorMessage: managedSettingsAudit.errorMessage,
          appliedAt: managedSettingsAudit.appliedAt,
        })
        .from(managedSettingsAudit)
        .where(
          and(
            eq(managedSettingsAudit.orgId, owner.ownerId),
            gte(managedSettingsAudit.appliedAt, sevenDaysAgo),
          ),
        )
        .orderBy(desc(managedSettingsAudit.appliedAt))
        .limit(20),
    ]);

  const totalHosts = hosts.length;
  const modeBreakdown = {
    off: 0,
    advisory: 0,
    enforced: 0,
  } as Record<"off" | "advisory" | "enforced", number>;
  for (const row of modeCounts) {
    if (row.mode === "off" || row.mode === "advisory" || row.mode === "enforced") {
      modeBreakdown[row.mode] = row.count;
    }
  }

  const applySuccess = applyCount.find((r) => r.success === true)?.count ?? 0;
  const applyFailure = applyCount.find((r) => r.success === false)?.count ?? 0;

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    org: {
      total_hosts: totalHosts,
      mode_breakdown: modeBreakdown,
    },
    activity_7d: {
      ungoverned: ungovernedCount[0]?.count ?? 0,
      tamper: tamperCount[0]?.count ?? 0,
      apply_success: applySuccess,
      apply_failure: applyFailure,
    },
    hosts: hosts.map((h) => ({
      host_id: h.hostId,
      os: h.os,
      os_version: h.osVersion,
      govern_mode: h.governMode,
      ai_clis_detected: h.aiClisDetected,
      active_frameworks: h.activeFrameworks,
      config_version: h.configVersion,
      first_seen: h.firstSeen?.toISOString(),
      last_seen: h.lastSeen?.toISOString(),
    })),
    recent: {
      tamper: recentTamper.map((t) => ({
        id: t.id,
        host_id: t.hostId,
        cli: t.cli,
        hook_name: t.hookName,
        last_seen: t.lastSeen?.toISOString() ?? null,
        detected_at: t.detectedAt?.toISOString(),
        resolved_at: t.resolvedAt?.toISOString() ?? null,
      })),
      ungoverned: recentUngov.map((u) => ({
        id: u.id,
        host_id: u.hostId,
        cli: u.cli,
        binary_path: u.binaryPath,
        sys_user: u.sysUser,
        action_taken: u.actionTaken,
        detected_at: u.detectedAt?.toISOString(),
      })),
      apply: recentApply.map((a) => ({
        id: a.id,
        host_id: a.hostId,
        cli: a.cli,
        version: a.version,
        source: a.source,
        success: a.success,
        error_message: a.errorMessage,
        applied_at: a.appliedAt?.toISOString(),
      })),
    },
  });
}
