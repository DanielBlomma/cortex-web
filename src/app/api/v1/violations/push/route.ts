import { NextResponse } from "next/server";
import { db } from "@/db";
import { policyViolations } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { verifyHmac } from "@/lib/hmac";
import { logAudit } from "@/lib/audit/log";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { violationPushSchema } from "@/lib/validators/violation";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  await ensureRuntimeSchema();
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

  const rawBody = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Verify HMAC signature if provided
  const signature = req.headers.get("x-cortex-signature");
  if (signature) {
    if (!key.hmacSecret || !verifyHmac(rawBody, key.hmacSecret, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const parsed = violationPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Reject violations with timestamps more than 7 days old or in the future
  const now = Date.now();
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const MAX_FUTURE_MS = 5 * 60 * 1000; // 5 min clock skew tolerance
  for (const v of parsed.data.violations) {
    const ts = new Date(v.occurred_at).getTime();
    if (now - ts > MAX_AGE_MS) {
      return NextResponse.json(
        { error: "Violation occurred_at is too old (max 7 days)" },
        { status: 400 }
      );
    }
    if (ts - now > MAX_FUTURE_MS) {
      return NextResponse.json(
        { error: "Violation occurred_at is in the future" },
        { status: 400 }
      );
    }
  }

  const repo = parsed.data.repo ?? null;
  const instanceId = parsed.data.instance_id ?? null;
  const sessionId = parsed.data.session_id ?? null;

  const rows = parsed.data.violations.map((v) => ({
    orgId: key.orgId,
    apiKeyId: key.id,
    apiKeyEnvironment: key.environment,
    repo,
    instanceId,
    sessionId,
    ruleId: v.rule_id,
    severity: v.severity,
    message: v.message,
    filePath: v.file_path ?? null,
    metadata: v.metadata ?? null,
    occurredAt: new Date(v.occurred_at),
  }));

  try {
    await db.insert(policyViolations).values(rows);
  } catch (err) {
    console.error("Violation insert failed:", err);
    return NextResponse.json(
      { error: "Failed to store violations" },
      { status: 500 }
    );
  }

  logAudit({
    orgId: key.orgId,
    action: "push",
    resourceType: "violation",
    resourceId: key.id,
    description: `Violation push accepted for ${key.environment}`,
    metadata: {
      api_key_id: key.id,
      environment: key.environment,
      instance_id: instanceId,
      session_id: sessionId,
      violation_count: rows.length,
      repo,
    },
    req,
  });

  return NextResponse.json({ ok: true, count: rows.length });
}
