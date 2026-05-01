import { NextResponse } from "next/server";
import { db } from "@/db";
import { hostEnrollment } from "@/db/schema";
import { sql } from "drizzle-orm";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { applyRateLimit } from "@/lib/rate-limit";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { governHeartbeatSchema } from "@/lib/validators/govern";

/**
 * POST /api/v1/govern/heartbeat
 *
 * Host pings cortex-web with current state. Upserts host_enrollment.
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

  const parsed = governHeartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const now = new Date();

  await db
    .insert(hostEnrollment)
    .values({
      orgId: key.orgId,
      hostId: payload.host_id,
      os: payload.os,
      osVersion: payload.os_version,
      aiClisDetected: payload.ai_clis_detected,
      governMode: payload.govern_mode,
      activeFrameworks: payload.active_frameworks,
      configVersion: payload.config_version ?? null,
      firstSeen: now,
      lastSeen: now,
    })
    .onConflictDoUpdate({
      target: [hostEnrollment.orgId, hostEnrollment.hostId],
      set: {
        os: payload.os,
        osVersion: payload.os_version,
        aiClisDetected: payload.ai_clis_detected,
        governMode: payload.govern_mode,
        activeFrameworks: payload.active_frameworks,
        configVersion: payload.config_version ?? sql`${hostEnrollment.configVersion}`,
        lastSeen: now,
      },
    });

  return NextResponse.json({ ok: true, server_time: now.toISOString() });
}
