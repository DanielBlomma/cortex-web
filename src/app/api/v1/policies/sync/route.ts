import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/db";
import { auditLog, policies } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { computeHmac } from "@/lib/hmac";
import { invalidateOwnerRouteCache } from "@/lib/cache/owner-route-cache";
import { upsertAuditDaily } from "@/lib/operations/rollups";
import { refreshOperationsSnapshot } from "@/lib/operations/snapshot";
import { applyRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/v1/policies/sync
 *
 * Enterprise-facing endpoint. Authenticated via Bearer API key.
 * Returns { rules: [...] } in the format cortex-enterprise expects.
 */
export async function GET(req: Request) {
  const rl = applyRateLimit(req, 60);
  if (rl) return rl;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const rawKey = authHeader.slice(7);
  const key = await verifyApiKey(rawKey);
  if (!key) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!key.scopes?.includes("policy")) {
    return NextResponse.json(
      { error: "Key does not have policy scope" },
      { status: 403 }
    );
  }

  const rows = await db
    .select({
      title: policies.title,
      ruleId: policies.ruleId,
      kind: policies.kind,
      status: policies.status,
      severity: policies.severity,
      description: policies.description,
      priority: policies.priority,
      scope: policies.scope,
      enforce: policies.enforce,
      type: policies.type,
      config: policies.config,
    })
    .from(policies)
    .where(and(eq(policies.orgId, key.orgId), eq(policies.status, "active")))
    .orderBy(policies.priority);

  const rules = rows.map((r) => ({
    id: r.ruleId,
    title: r.title,
    kind: r.kind,
    status: r.status,
    severity: r.severity,
    description: r.description,
    priority: r.priority,
    scope: r.scope,
    enforce: r.enforce,
    type: r.type,
    config: r.config,
  }));

  // Compute version hash for cache invalidation + integrity
  const rulesJson = JSON.stringify(rules);
  const version = createHash("sha256").update(rulesJson).digest("hex");

  const response: Record<string, unknown> = { rules, version };

  // Sign version with HMAC if key has a secret
  if (key.hmacSecret) {
    response.signature = `sha256=${computeHmac(version, key.hmacSecret)}`;
  }

  const instanceId = req.headers.get("x-cortex-instance-id");
  const sessionId = req.headers.get("x-cortex-session-id");
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const occurredAt = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(auditLog).values({
      orgId: key.orgId,
      apiKeyId: key.id,
      apiKeyEnvironment: key.environment,
      source: "web",
      action: "sync",
      eventType: "policy_sync",
      evidenceLevel: "diagnostic",
      resourceType: "policy_sync",
      resourceId: key.id,
      instanceId,
      sessionId,
      description: `Policy sync served for ${key.environment}`,
      metadata: JSON.stringify({
        api_key_id: key.id,
        environment: key.environment,
        instance_id: instanceId,
        session_id: sessionId,
        synced_rules: rules.length,
        version,
      }),
      ipAddress,
      userAgent,
      occurredAt,
    });
    await upsertAuditDaily(tx, {
      orgId: key.orgId,
      occurredAt,
      source: "web",
      evidenceLevel: "diagnostic",
      eventType: "policy_sync",
    });
  });

  await refreshOperationsSnapshot(key.orgId);
  await invalidateOwnerRouteCache(key.orgId);

  return NextResponse.json(response);
}
