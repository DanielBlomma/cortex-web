import { NextResponse } from "next/server";
import { db } from "@/db";
import { hookTamperEvent } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { applyRateLimit } from "@/lib/rate-limit";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { hookTamperReportSchema } from "@/lib/validators/govern";

/**
 * POST /api/v1/govern/tamper
 *
 * Batch ingest of hook_tamper_detected events from the cortex daemon.
 * Persisted to hook_tamper_event for the audit timeline.
 */
export async function POST(req: Request) {
  await ensureRuntimeSchema();
  const rl = applyRateLimit(req, 12);
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

  const parsed = hookTamperReportSchema.safeParse(body);
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
    hookName: e.hook_name,
    lastSeen: e.last_seen ? new Date(e.last_seen) : null,
    detectedAt: new Date(e.detected_at),
  }));

  await db.insert(hookTamperEvent).values(rows);

  return NextResponse.json({ ok: true, ingested: rows.length });
}
