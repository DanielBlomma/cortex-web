import { NextResponse } from "next/server";
import { db } from "@/db";
import { policies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyApiKey } from "@/lib/api-keys/verify";

export async function GET(req: Request) {
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

  const orgPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.orgId, key.orgId));

  // Map to the exact format expected by cortex-enterprise CloudResponseSchema
  const rules = orgPolicies.map((p) => ({
    id: p.ruleId,
    description: p.description,
    priority: p.priority,
    scope: p.scope,
    enforce: p.enforce,
  }));

  return NextResponse.json({ rules });
}
