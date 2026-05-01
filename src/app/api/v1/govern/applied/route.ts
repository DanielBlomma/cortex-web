import { NextResponse } from "next/server";
import { db } from "@/db";
import { managedSettingsAudit, hostEnrollment } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { applyRateLimit } from "@/lib/rate-limit";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { governAppliedSchema } from "@/lib/validators/govern";

/**
 * POST /api/v1/govern/applied
 *
 * Idempotent acknowledgement that a host applied (or failed to apply) a govern config version.
 * Updates host_enrollment.config_version on success.
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

  const parsed = governAppliedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  await db.insert(managedSettingsAudit).values({
    orgId: key.orgId,
    hostId: payload.host_id,
    instanceId: payload.instance_id,
    cli: payload.cli,
    version: payload.version,
    source: payload.source,
    success: payload.success,
    errorMessage: payload.error_message,
  });

  if (payload.success) {
    await db
      .update(hostEnrollment)
      .set({ configVersion: payload.version, lastSeen: new Date() })
      .where(and(eq(hostEnrollment.orgId, key.orgId), eq(hostEnrollment.hostId, payload.host_id)));
  }

  return NextResponse.json({ ok: true });
}
