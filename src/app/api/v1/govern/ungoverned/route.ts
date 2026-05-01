import { NextResponse } from "next/server";
import { db } from "@/db";
import { ungovernedSessionEvent } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { applyRateLimit } from "@/lib/rate-limit";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { ungovernedReportSchema } from "@/lib/validators/govern";

/**
 * POST /api/v1/govern/ungoverned
 *
 * Batch ingest of Tier 3 ungoverned-session detections from the cortex
 * daemon. Each event lands in ungoverned_session_event for the dashboard
 * to visualise.
 */
export async function POST(req: Request) {
  await ensureRuntimeSchema();
  const rl = applyRateLimit(req, 60);
  if (rl) return rl;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }
  const key = await verifyApiKey(authHeader.slice(7));
  if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  if (!key.scopes?.includes("govern")) {
    return NextResponse.json({ error: "Key does not have govern scope" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ungovernedReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rows = parsed.data.events.map((e) => ({
    orgId: key.orgId,
    hostId: e.host_id,
    cli: e.cli,
    binaryPath: e.binary_path,
    args: e.args ?? null,
    sysUser: e.sys_user ?? null,
    parentPid: e.parent_pid ?? null,
    pid: e.pid ?? null,
    detectedAt: new Date(e.detected_at),
    actionTaken: e.action_taken,
  }));

  await db.insert(ungovernedSessionEvent).values(rows);

  return NextResponse.json({ ok: true, ingested: rows.length });
}
