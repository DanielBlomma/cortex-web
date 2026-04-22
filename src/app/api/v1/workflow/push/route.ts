import { NextResponse } from "next/server";
import { db } from "@/db";
import { workflowSnapshots } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { logAudit } from "@/lib/audit/log";
import { workflowPushSchema } from "@/lib/validators/workflow";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = workflowPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  await db.insert(workflowSnapshots).values({
    orgId: key.orgId,
    apiKeyId: key.id,
    apiKeyEnvironment: key.environment,
    repo: data.repo ?? null,
    instanceId: data.instance_id ?? null,
    sessionId: data.session_id ?? null,
    phase: data.workflow.phase,
    approvalStatus: data.workflow.approval.status,
    planStatus: data.workflow.plan.status,
    reviewStatus: data.workflow.last_review.status,
    blockedReasons: data.workflow.blocked_reasons,
    snapshot: data.workflow,
  });

  logAudit({
    orgId: key.orgId,
    action: "push",
    resourceType: "workflow",
    resourceId: key.id,
    description: `Workflow snapshot accepted for ${key.environment}`,
    metadata: {
      api_key_id: key.id,
      environment: key.environment,
      repo: data.repo ?? null,
      instance_id: data.instance_id ?? null,
      session_id: data.session_id ?? null,
      phase: data.workflow.phase,
      approval_status: data.workflow.approval.status,
    },
    req,
  });

  return NextResponse.json({ ok: true });
}
