import { NextResponse } from "next/server";
import { db } from "@/db";
import { policies, policyViolations, reviews } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { createPolicySchema } from "@/lib/validators/policy";
import { getOwnerId } from "@/lib/auth/owner";
import { logAudit } from "@/lib/audit/log";
import { applyRateLimit } from "@/lib/rate-limit";
import { isPredefinedRule } from "@/lib/policies/predefined-rules";
import { harmonizePolicyConfigSeverity } from "@/lib/policies/config";

function normalizedPolicyForCreate(input: ReturnType<typeof createPolicySchema.parse>) {
  const kind = input.kind ?? (isPredefinedRule(input.ruleId) ? "predefined" : "custom");
  const config = input.type
    ? harmonizePolicyConfigSeverity(input.severity, input.config)
    : input.config;

  return {
    ...input,
    kind,
    config,
  };
}

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
    .orderBy(desc(policies.priority));

  const reviewStats = await db
    .select({
      policyId: reviews.policyId,
      reviewFailureCount: sql<number>`count(*) filter (where ${reviews.pass} = false and ${reviews.severity} = 'error')`,
      warningReviewCount: sql<number>`count(*) filter (where ${reviews.pass} = false and ${reviews.severity} = 'warning')`,
      lastReviewAt: sql<string>`max(${reviews.reviewedAt})`,
    })
    .from(reviews)
    .where(eq(reviews.orgId, owner.ownerId))
    .groupBy(reviews.policyId);

  const violationStats = await db
    .select({
      ruleId: policyViolations.ruleId,
      violationCount: sql<number>`count(*)`,
      lastViolationAt: sql<string>`max(${policyViolations.occurredAt})`,
    })
    .from(policyViolations)
    .where(eq(policyViolations.orgId, owner.ownerId))
    .groupBy(policyViolations.ruleId);

  const reviewMap = new Map(reviewStats.map((row) => [row.policyId, row]));
  const violationMap = new Map(violationStats.map((row) => [row.ruleId, row]));

  const hydrated = rows.map((policy) => {
    const review = reviewMap.get(policy.ruleId);
    const violation = violationMap.get(policy.ruleId);
    const lastTriggeredAt =
      [review?.lastReviewAt ?? null, violation?.lastViolationAt ?? null]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

    return {
      ...policy,
      reviewFailureCount: Number(review?.reviewFailureCount ?? 0),
      warningReviewCount: Number(review?.warningReviewCount ?? 0),
      violationCount: Number(violation?.violationCount ?? 0),
      lastTriggeredAt,
      recentlyTriggered:
        Number(review?.reviewFailureCount ?? 0) > 0 ||
        Number(review?.warningReviewCount ?? 0) > 0 ||
        Number(violation?.violationCount ?? 0) > 0,
    };
  });

  return NextResponse.json({ policies: hydrated });
}

export async function POST(req: Request) {
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (owner.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can create policies" },
      { status: 403 }
    );
  }

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
    const normalized = normalizedPolicyForCreate(parsed.data);
    const [policy] = await db
      .insert(policies)
      .values({
        orgId: owner.ownerId,
        ...normalized,
        createdBy: owner.userId,
      })
      .returning();

    logAudit({
      orgId: owner.ownerId,
      userId: owner.userId,
      action: "create",
      resourceType: "policy",
      resourceId: policy.id,
      description: `Created policy ${normalized.ruleId}`,
      metadata: {
        ruleId: normalized.ruleId,
        kind: normalized.kind,
        status: normalized.status,
        severity: normalized.severity,
        enforce: normalized.enforce,
      },
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
