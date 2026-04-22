import { NextResponse } from "next/server";
import { db } from "@/db";
import { telemetryEvents } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { verifyHmac } from "@/lib/hmac";
import { logAudit } from "@/lib/audit/log";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { telemetryPushSchema } from "@/lib/validators/telemetry";
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

  if (!key.scopes?.includes("telemetry")) {
    return NextResponse.json(
      { error: "Key does not have telemetry scope" },
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

  const parsed = telemetryPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Reject telemetry with timestamps more than 24h from now
  const now = Date.now();
  const periodEnd = new Date(data.period_end).getTime();
  const MAX_DRIFT_MS = 24 * 60 * 60 * 1000;
  if (Math.abs(periodEnd - now) > MAX_DRIFT_MS) {
    return NextResponse.json(
      { error: "period_end is too far from current time (max 24h drift)" },
      { status: 400 }
    );
  }

  await db.insert(telemetryEvents).values({
    orgId: key.orgId,
    apiKeyId: key.id,
    apiKeyEnvironment: key.environment,
    periodStart: new Date(data.period_start),
    periodEnd: new Date(data.period_end),
    totalToolCalls: data.total_tool_calls ?? 0,
    successfulToolCalls: data.successful_tool_calls ?? 0,
    failedToolCalls: data.failed_tool_calls ?? 0,
    totalDurationMs: data.total_duration_ms ?? 0,
    sessionStarts: data.session_starts ?? 0,
    sessionEnds: data.session_ends ?? 0,
    sessionDurationMsTotal: data.session_duration_ms_total ?? 0,
    searches: data.searches,
    relatedLookups: data.related_lookups,
    callerLookups: data.caller_lookups ?? 0,
    traceLookups: data.trace_lookups ?? 0,
    impactAnalyses: data.impact_analyses ?? 0,
    ruleLookups: data.rule_lookups,
    reloads: data.reloads,
    totalResultsReturned: data.total_results_returned,
    estimatedTokensSaved: data.estimated_tokens_saved,
    estimatedTokensTotal: data.estimated_tokens_total ?? 0,
    clientVersion: data.client_version ?? null,
    instanceId: data.instance_id ?? null,
    sessionId: data.session_id ?? null,
    toolMetrics: data.tool_metrics ?? null,
  });

  logAudit({
    orgId: key.orgId,
    action: "push",
    resourceType: "telemetry",
    resourceId: key.id,
    description: `Telemetry push accepted for ${key.environment}`,
    metadata: {
      api_key_id: key.id,
      environment: key.environment,
      instance_id: data.instance_id ?? null,
      session_id: data.session_id ?? null,
      total_tool_calls: data.total_tool_calls ?? 0,
    },
    req,
  });

  return NextResponse.json({ ok: true });
}
