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
import {
  buildCombinedCsv,
  buildEventsCsvOnly,
  buildHostsCsvOnly,
  signSnapshot,
  type SnapshotBody,
  type SnapshotEvent,
  type SnapshotHost,
} from "@/lib/govern/snapshot";
import { withTimeout } from "@/lib/timeout";

/**
 * Per-query budget for the fan-out reads in this route. If a single query
 * exceeds it, we record the section as `degraded` and return zero/empty
 * for that section rather than letting one slow query stall the whole
 * snapshot.
 */
const QUERY_TIMEOUT_MS = 5000;

/**
 * GET /api/v1/govern/snapshot?format=json|csv&part=hosts|events
 *
 * Compliance snapshot for revisor. Same data as /api/v1/govern/overview
 * but framed as a tamper-evident artefact:
 *   - format=json (default): SignedSnapshot with HMAC-SHA256 over the body
 *   - format=csv: combined human-readable CSV with totals header + hosts +
 *                 events (last 7 days). Mixes `#`-comments and multiple
 *                 sections, which strict RFC-4180 parsers reject.
 *   - format=csv&part=hosts: clean RFC-4180 CSV of just the hosts table.
 *   - format=csv&part=events: clean RFC-4180 CSV of just the events table.
 *
 * Signing key comes from CORTEX_SNAPSHOT_SIGNING_KEY env. If unset, JSON
 * format returns 500 — operator misconfiguration, not a transient outage.
 * The optional CORTEX_SNAPSHOT_SIGNING_KEY_ID env names the key for
 * verifiers; if absent we derive a short fingerprint from the secret.
 */
export async function GET(req: Request) {
  await ensureRuntimeSchema();
  const rl = applyRateLimit(req, 12);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const format = params.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return NextResponse.json(
      { error: "format must be 'json' or 'csv'" },
      { status: 400 },
    );
  }
  const part = params.get("part");
  if (part !== null && part !== "hosts" && part !== "events") {
    return NextResponse.json(
      { error: "part must be 'hosts' or 'events' when set" },
      { status: 400 },
    );
  }
  if (part !== null && format !== "csv") {
    return NextResponse.json(
      { error: "part is only valid with format=csv" },
      { status: 400 },
    );
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const degradedSections: string[] = [];
  function record<T>(section: string, result: { value: T; timedOut: boolean }): T {
    if (result.timedOut) degradedSections.push(section);
    return result.value;
  }

  const [
    hostsResult,
    modeCountsResult,
    ungovernedCountResult,
    tamperCountResult,
    applyCountResult,
    recentTamperResult,
    recentUngovResult,
    recentApplyResult,
  ] = await Promise.all([
    withTimeout(
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
      QUERY_TIMEOUT_MS,
      [],
    ),
    withTimeout(
      db
        .select({ mode: hostEnrollment.governMode, count: sql<number>`count(*)::int` })
        .from(hostEnrollment)
        .where(eq(hostEnrollment.orgId, owner.ownerId))
        .groupBy(hostEnrollment.governMode),
      QUERY_TIMEOUT_MS,
      [],
    ),
    withTimeout(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(ungovernedSessionEvent)
        .where(
          and(
            eq(ungovernedSessionEvent.orgId, owner.ownerId),
            gte(ungovernedSessionEvent.detectedAt, sevenDaysAgo),
          ),
        ),
      QUERY_TIMEOUT_MS,
      [],
    ),
    withTimeout(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(hookTamperEvent)
        .where(
          and(
            eq(hookTamperEvent.orgId, owner.ownerId),
            gte(hookTamperEvent.detectedAt, sevenDaysAgo),
          ),
        ),
      QUERY_TIMEOUT_MS,
      [],
    ),
    withTimeout(
      db
        .select({ success: managedSettingsAudit.success, count: sql<number>`count(*)::int` })
        .from(managedSettingsAudit)
        .where(
          and(
            eq(managedSettingsAudit.orgId, owner.ownerId),
            gte(managedSettingsAudit.appliedAt, sevenDaysAgo),
          ),
        )
        .groupBy(managedSettingsAudit.success),
      QUERY_TIMEOUT_MS,
      [],
    ),
    withTimeout(
      db
        .select({
          hostId: hookTamperEvent.hostId,
          cli: hookTamperEvent.cli,
          hookName: hookTamperEvent.hookName,
          detectedAt: hookTamperEvent.detectedAt,
        })
        .from(hookTamperEvent)
        .where(
          and(
            eq(hookTamperEvent.orgId, owner.ownerId),
            gte(hookTamperEvent.detectedAt, sevenDaysAgo),
          ),
        )
        .orderBy(desc(hookTamperEvent.detectedAt))
        .limit(200),
      QUERY_TIMEOUT_MS,
      [],
    ),
    withTimeout(
      db
        .select({
          hostId: ungovernedSessionEvent.hostId,
          cli: ungovernedSessionEvent.cli,
          binaryPath: ungovernedSessionEvent.binaryPath,
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
        .limit(200),
      QUERY_TIMEOUT_MS,
      [],
    ),
    withTimeout(
      db
        .select({
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
        .limit(200),
      QUERY_TIMEOUT_MS,
      [],
    ),
  ]);

  const hosts = record("hosts", hostsResult);
  const modeCounts = record("mode_counts", modeCountsResult);
  const ungovernedCount = record("ungoverned_count", ungovernedCountResult);
  const tamperCount = record("tamper_count", tamperCountResult);
  const applyCount = record("apply_count", applyCountResult);
  const recentTamper = record("recent_tamper", recentTamperResult);
  const recentUngov = record("recent_ungoverned", recentUngovResult);
  const recentApply = record("recent_apply", recentApplyResult);
  const degraded = degradedSections.length > 0;

  const modeBreakdown = { off: 0, advisory: 0, enforced: 0 };
  for (const row of modeCounts) {
    if (row.mode === "off" || row.mode === "advisory" || row.mode === "enforced") {
      modeBreakdown[row.mode] = row.count;
    }
  }

  const applySuccess = applyCount.find((r) => r.success === true)?.count ?? 0;
  const applyFailure = applyCount.find((r) => r.success === false)?.count ?? 0;

  const snapshotHosts: SnapshotHost[] = hosts.map((h) => ({
    host_id: h.hostId,
    os: h.os,
    os_version: h.osVersion ?? null,
    govern_mode: h.governMode as "off" | "advisory" | "enforced",
    ai_clis_detected: ((h.aiClisDetected ?? []) as unknown as SnapshotHost["ai_clis_detected"]) ?? [],
    active_frameworks: ((h.activeFrameworks ?? []) as unknown as string[]) ?? [],
    config_version: h.configVersion ?? null,
    first_seen: h.firstSeen?.toISOString() ?? null,
    last_seen: h.lastSeen?.toISOString() ?? null,
  }));

  const events: SnapshotEvent[] = [
    ...recentTamper.map<SnapshotEvent>((t) => ({
      category: "tamper",
      detected_at: t.detectedAt?.toISOString() ?? new Date(0).toISOString(),
      host_id: t.hostId,
      cli: t.cli,
      description: `hook ${t.hookName} silent`,
    })),
    ...recentUngov.map<SnapshotEvent>((u) => ({
      category: "ungoverned",
      detected_at: u.detectedAt?.toISOString() ?? new Date(0).toISOString(),
      host_id: u.hostId,
      cli: u.cli,
      description: `${u.binaryPath} (action=${u.actionTaken})`,
    })),
    ...recentApply.map<SnapshotEvent>((a) => ({
      category: "apply",
      detected_at: a.appliedAt?.toISOString() ?? new Date(0).toISOString(),
      host_id: a.hostId,
      cli: a.cli,
      description: `version=${a.version} source=${a.source} ${a.success ? "ok" : `failed: ${a.errorMessage ?? "unknown"}`}`,
    })),
  ].sort((a, b) => b.detected_at.localeCompare(a.detected_at));

  const body: SnapshotBody = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    org_id: owner.ownerId,
    totals: {
      hosts: hosts.length,
      enforced: modeBreakdown.enforced,
      advisory: modeBreakdown.advisory,
      off: modeBreakdown.off,
      tamper_7d: tamperCount[0]?.count ?? 0,
      ungoverned_7d: ungovernedCount[0]?.count ?? 0,
      apply_success_7d: applySuccess,
      apply_failure_7d: applyFailure,
    },
    hosts: snapshotHosts,
    events,
  };

  if (format === "csv") {
    const dateStamp = body.generated_at.slice(0, 10);
    let csv: string;
    let filename: string;
    if (part === "hosts") {
      csv = buildHostsCsvOnly(body);
      filename = `cortex-govern-snapshot-${dateStamp}-hosts.csv`;
    } else if (part === "events") {
      csv = buildEventsCsvOnly(body);
      filename = `cortex-govern-snapshot-${dateStamp}-events.csv`;
    } else {
      csv = buildCombinedCsv(body);
      filename = `cortex-govern-snapshot-${dateStamp}.csv`;
    }
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        ...(degraded
          ? { "X-Cortex-Degraded": degradedSections.join(",") }
          : {}),
      },
    });
  }

  const secret = process.env.CORTEX_SNAPSHOT_SIGNING_KEY;
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "Snapshot signing not configured. Set CORTEX_SNAPSHOT_SIGNING_KEY in the cortex-web environment to enable signed JSON exports. CSV exports work without signing.",
      },
      // 500 — operator misconfiguration, a permanent error from the
      // client's perspective until the env var is set. Not 503 (transient
      // outage) and not 501 (feature unimplemented): the feature exists,
      // it just isn't configured here.
      { status: 500 },
    );
  }

  const keyId = process.env.CORTEX_SNAPSHOT_SIGNING_KEY_ID;
  const signed = signSnapshot(body, secret, keyId);
  return NextResponse.json(
    { ...signed, degraded, degraded_sections: degradedSections },
    {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="cortex-govern-snapshot-${body.generated_at.slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
