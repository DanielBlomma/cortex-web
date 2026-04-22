import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { verifyHmac } from "@/lib/hmac";
import { logAudit } from "@/lib/audit/log";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { auditPushSchema } from "@/lib/validators/audit";
import { applyRateLimit } from "@/lib/rate-limit";

function inferResourceType(tool: string): string {
  if (tool.startsWith("workflow.")) return "workflow";
  if (tool.startsWith("policy.")) return "policy";
  if (tool.startsWith("telemetry.")) return "telemetry";
  if (tool.startsWith("security.")) return "policy";
  if (tool === "context.review") return "review";
  if (tool === "session.summary") return "session";
  return "audit";
}

function buildDescription(tool: string, status?: "success" | "error", error?: string): string {
  if (status === "error") {
    return `${tool} failed${error ? `: ${error.slice(0, 200)}` : ""}`;
  }
  if (status === "success") {
    return `${tool} completed`;
  }
  return `${tool} recorded`;
}

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

  const signature = req.headers.get("x-cortex-signature");
  if (signature) {
    if (!key.hmacSecret || !verifyHmac(rawBody, key.hmacSecret, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const parsed = auditPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const repo = data.repo ?? null;
  const instanceId = data.instance_id ?? null;
  const sessionId = data.session_id ?? null;

  const rows = data.events.map((event) => ({
    orgId: key.orgId,
    apiKeyId: key.id,
    apiKeyEnvironment: key.environment,
    source: "client" as const,
    action: event.event_type ?? "tool_call",
    eventType: event.event_type ?? "tool_call",
    evidenceLevel: event.evidence_level ?? "diagnostic",
    resourceType: event.resource_type ?? inferResourceType(event.tool),
    resourceId: event.resource_id ?? null,
    repo: event.repo ?? repo,
    instanceId: event.instance_id ?? instanceId,
    sessionId: event.session_id ?? sessionId,
    description: buildDescription(event.tool, event.status, event.error),
    metadata: JSON.stringify({
      tool: event.tool,
      input: event.input,
      result_count: event.result_count,
      entities_returned: event.entities_returned,
      rules_applied: event.rules_applied,
      duration_ms: event.duration_ms,
      status: event.status ?? null,
      error: event.error ?? null,
      ...(event.metadata ?? {}),
    }),
    occurredAt: new Date(event.timestamp),
  }));

  try {
    await db.insert(auditLog).values(rows);
  } catch (err) {
    console.error("Audit insert failed:", err);
    return NextResponse.json(
      { error: "Failed to store audit events" },
      { status: 500 }
    );
  }

  logAudit({
    orgId: key.orgId,
    apiKeyId: key.id,
    apiKeyEnvironment: key.environment,
    action: "ingest",
    eventType: "audit_ingest",
    evidenceLevel: "diagnostic",
    resourceType: "audit",
    repo,
    instanceId,
    sessionId,
    source: "web",
    description: `Audit event batch accepted for ${key.environment}`,
    metadata: {
      api_key_id: key.id,
      environment: key.environment,
      event_count: rows.length,
      repo,
      instance_id: instanceId,
      session_id: sessionId,
    },
    req,
  });

  return NextResponse.json({ ok: true, count: rows.length });
}
