import { NextResponse } from "next/server";
import { db } from "@/db";
import { policies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyApiKey } from "@/lib/api-keys/verify";
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
      ruleId: policies.ruleId,
      description: policies.description,
      priority: policies.priority,
      scope: policies.scope,
      enforce: policies.enforce,
    })
    .from(policies)
    .where(eq(policies.orgId, key.orgId))
    .orderBy(policies.priority);

  const rules = rows.map((r) => ({
    id: r.ruleId,
    description: r.description,
    priority: r.priority,
    scope: r.scope,
    enforce: r.enforce,
  }));

  return NextResponse.json({ rules });
}
