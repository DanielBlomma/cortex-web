import { NextResponse } from "next/server";
import { db } from "@/db";
import { policies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPolicySchema } from "@/lib/validators/policy";
import { getOwnerId } from "@/lib/auth/owner";
import { logAudit } from "@/lib/audit/log";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(policies)
    .where(eq(policies.orgId, owner.ownerId))
    .orderBy(policies.priority);

  return NextResponse.json({ policies: rows });
}

export async function POST(req: Request) {
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const [policy] = await db
      .insert(policies)
      .values({
        orgId: owner.ownerId,
        ...parsed.data,
        createdBy: owner.userId,
      })
      .returning();

    logAudit({
      orgId: owner.ownerId,
      userId: owner.userId,
      action: "create",
      resourceType: "policy",
      resourceId: policy.id,
      description: `Created policy ${parsed.data.ruleId}`,
      metadata: { ruleId: parsed.data.ruleId, enforce: parsed.data.enforce },
      req,
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A policy with this rule ID already exists" },
        { status: 409 }
      );
    }
    console.error("Policy creation failed:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Failed to create policy" }, { status: 500 });
  }
}
