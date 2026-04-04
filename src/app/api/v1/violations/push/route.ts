import { NextResponse } from "next/server";
import { db } from "@/db";
import { policyViolations } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { violationPushSchema } from "@/lib/validators/violation";
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

  const parsed = violationPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const repo = parsed.data.repo ?? null;

  const rows = parsed.data.violations.map((v) => ({
    orgId: key.orgId,
    apiKeyId: key.id,
    repo,
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

  return NextResponse.json({ ok: true, count: rows.length });
}
