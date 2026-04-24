import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { reviews, reviewsDaily } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { verifyHmac } from "@/lib/hmac";
import { logAudit } from "@/lib/audit/log";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { invalidateOwnerRouteCache } from "@/lib/cache/owner-route-cache";
import { upsertPolicyRuleStats } from "@/lib/operations/rollups";
import { refreshOperationsSnapshot } from "@/lib/operations/snapshot";
import { reviewPushSchema } from "@/lib/validators/review";
import { applyRateLimit } from "@/lib/rate-limit";

function reviewDayKey(reviewedAtIso: string): string {
  return new Date(reviewedAtIso).toISOString().slice(0, 10);
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

  const parsed = reviewPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = Date.now();
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const MAX_FUTURE_MS = 5 * 60 * 1000;
  for (const r of parsed.data.reviews) {
    const ts = new Date(r.reviewed_at).getTime();
    if (now - ts > MAX_AGE_MS) {
      return NextResponse.json(
        { error: "Review reviewed_at is too old (max 7 days)" },
        { status: 400 }
      );
    }
    if (ts - now > MAX_FUTURE_MS) {
      return NextResponse.json(
        { error: "Review reviewed_at is in the future" },
        { status: 400 }
      );
    }
  }

  const repo = parsed.data.repo ?? null;
  const instanceId = parsed.data.instance_id ?? null;
  const sessionId = parsed.data.session_id ?? null;

  const rows = parsed.data.reviews.map((r) => ({
    orgId: key.orgId,
    apiKeyId: key.id,
    apiKeyEnvironment: key.environment,
    repo,
    instanceId,
    sessionId,
    policyId: r.policy_id,
    pass: r.pass,
    severity: r.severity,
    message: r.message,
    detail: r.detail ?? null,
    reviewedAt: new Date(r.reviewed_at),
  }));

  const policyStats = new Map<
    string,
    {
      reviewFailureCount: number;
      warningReviewCount: number;
      lastReviewAt: Date | null;
    }
  >();
  for (const review of parsed.data.reviews) {
    const reviewedAt = new Date(review.reviewed_at);
    const existing = policyStats.get(review.policy_id) ?? {
      reviewFailureCount: 0,
      warningReviewCount: 0,
      lastReviewAt: null,
    };
    if (!review.pass && review.severity === "error") {
      existing.reviewFailureCount += 1;
    }
    if (!review.pass && review.severity === "warning") {
      existing.warningReviewCount += 1;
    }
    existing.lastReviewAt =
      !existing.lastReviewAt || reviewedAt > existing.lastReviewAt
        ? reviewedAt
        : existing.lastReviewAt;
    policyStats.set(review.policy_id, existing);
  }

  const dailyRollups = new Map<
    string,
    {
      totalCount: number;
      passedCount: number;
      failedCount: number;
      errorCount: number;
      warningCount: number;
    }
  >();
  for (const review of parsed.data.reviews) {
    const date = reviewDayKey(review.reviewed_at);
    const existing = dailyRollups.get(date) ?? {
      totalCount: 0,
      passedCount: 0,
      failedCount: 0,
      errorCount: 0,
      warningCount: 0,
    };
    existing.totalCount += 1;
    if (review.pass) {
      existing.passedCount += 1;
    } else {
      existing.failedCount += 1;
      if (review.severity === "error") {
        existing.errorCount += 1;
      } else if (review.severity === "warning") {
        existing.warningCount += 1;
      }
    }
    dailyRollups.set(date, existing);
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(reviews).values(rows);
      for (const [date, rollup] of dailyRollups) {
        await tx
          .insert(reviewsDaily)
          .values({
            orgId: key.orgId,
            date,
            totalCount: rollup.totalCount,
            passedCount: rollup.passedCount,
            failedCount: rollup.failedCount,
            errorCount: rollup.errorCount,
            warningCount: rollup.warningCount,
          })
          .onConflictDoUpdate({
            target: [reviewsDaily.orgId, reviewsDaily.date],
            set: {
              totalCount: sql`${reviewsDaily.totalCount} + ${rollup.totalCount}`,
              passedCount: sql`${reviewsDaily.passedCount} + ${rollup.passedCount}`,
              failedCount: sql`${reviewsDaily.failedCount} + ${rollup.failedCount}`,
              errorCount: sql`${reviewsDaily.errorCount} + ${rollup.errorCount}`,
              warningCount: sql`${reviewsDaily.warningCount} + ${rollup.warningCount}`,
            },
          });
      }
      for (const [ruleId, stats] of policyStats) {
        await upsertPolicyRuleStats(tx, {
          orgId: key.orgId,
          ruleId,
          reviewFailureCount: stats.reviewFailureCount,
          warningReviewCount: stats.warningReviewCount,
          lastReviewAt: stats.lastReviewAt,
        });
      }
    });
    await refreshOperationsSnapshot(key.orgId);
    await invalidateOwnerRouteCache(key.orgId);
  } catch (err) {
    console.error("Review insert failed:", err);
    return NextResponse.json(
      { error: "Failed to store reviews" },
      { status: 500 }
    );
  }

  logAudit({
    orgId: key.orgId,
    action: "push",
    resourceType: "review",
    resourceId: key.id,
    description: `Review push accepted for ${key.environment}`,
    metadata: {
      api_key_id: key.id,
      environment: key.environment,
      instance_id: instanceId,
      session_id: sessionId,
      review_count: rows.length,
      repo,
    },
    req,
  });

  return NextResponse.json({ ok: true, count: rows.length });
}
