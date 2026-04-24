import { NextResponse } from "next/server";
import { db } from "@/db";
import { policies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updatePolicySchema } from "@/lib/validators/policy";
import { UUID_RE } from "@/lib/validators/uuid";
import { getOwnerId } from "@/lib/auth/owner";
import { logAudit } from "@/lib/audit/log";
import { invalidateOwnerRouteCache } from "@/lib/cache/owner-route-cache";
import { refreshOperationsSnapshot } from "@/lib/operations/snapshot";
import { applyRateLimit } from "@/lib/rate-limit";
import { resolvePolicyUpdateConfig } from "@/lib/policies/config";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = applyRateLimit(_req, 30);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: "Invalid policy ID" }, { status: 400 });

  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.id, id), eq(policies.orgId, owner.ownerId)));

  if (!policy)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ policy });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (owner.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can update policies" },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: "Invalid policy ID" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updatePolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [existingPolicy] = await db
    .select({
      id: policies.id,
      ruleId: policies.ruleId,
      severity: policies.severity,
      config: policies.config,
    })
    .from(policies)
    .where(and(eq(policies.id, id), eq(policies.orgId, owner.ownerId)));

  if (!existingPolicy)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextConfig = resolvePolicyUpdateConfig(
    {
      severity: existingPolicy.severity,
      config: existingPolicy.config as Record<string, unknown> | null | undefined,
    },
    parsed.data
  );
  const updateValues: Partial<typeof policies.$inferInsert> = {
    ...parsed.data,
    updatedAt: new Date(),
  };
  if (nextConfig !== undefined) {
    updateValues.config = nextConfig;
  }

  const [policy] = await db
    .update(policies)
    .set(updateValues)
    .where(and(eq(policies.id, id), eq(policies.orgId, owner.ownerId)))
    .returning();

  if (!policy)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await refreshOperationsSnapshot(owner.ownerId);
  await invalidateOwnerRouteCache(owner.ownerId);

  logAudit({
    orgId: owner.ownerId,
    userId: owner.userId,
    action: "update",
    resourceType: "policy",
    resourceId: id,
    description: `Updated policy ${policy.ruleId}`,
    metadata: parsed.data,
    req,
  });

  return NextResponse.json({ policy });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = applyRateLimit(_req, 20);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (owner.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can delete policies" },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: "Invalid policy ID" }, { status: 400 });

  const [policy] = await db
    .delete(policies)
    .where(and(eq(policies.id, id), eq(policies.orgId, owner.ownerId)))
    .returning({ id: policies.id, ruleId: policies.ruleId });

  if (!policy)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await refreshOperationsSnapshot(owner.ownerId);
  await invalidateOwnerRouteCache(owner.ownerId);

  logAudit({
    orgId: owner.ownerId,
    userId: owner.userId,
    action: "delete",
    resourceType: "policy",
    resourceId: id,
    description: `Deleted policy ${policy.ruleId}`,
    req: _req,
  });

  return NextResponse.json({ ok: true });
}
