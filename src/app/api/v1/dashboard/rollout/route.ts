import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, operationsSnapshots, organizations } from "@/db/schema";
import { applyRateLimit } from "@/lib/rate-limit";
import { getOwnerId } from "@/lib/auth/owner";
import {
  assertOrgScopeHasDataOrThrow,
  OrgScopeMismatchError,
} from "@/lib/org-scope";
import { buildOperationalHealthSummary } from "@/lib/operations/health";
import { createRequestTiming } from "@/lib/perf/request-timing";
import { cacheOwnerRoute } from "@/lib/cache/owner-route-cache";

class DashboardRolloutQueryError extends Error {
  constructor(
    public step: string,
    public cause: unknown,
  ) {
    super(`Failed to load dashboard rollout at ${step}`);
    this.name = "DashboardRolloutQueryError";
  }
}

function describeError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : null;
    return code ? `${code}: ${error.message}` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

async function runStep<T>(
  timing: ReturnType<typeof createRequestTiming>,
  step: string,
  query: () => Promise<T>,
): Promise<T> {
  try {
    return await timing.timeStep(step, query);
  } catch (error) {
    throw new DashboardRolloutQueryError(step, error);
  }
}

export async function GET(req: Request) {
  const timing = createRequestTiming();

  try {
    const rl = applyRateLimit(req, 30);
    if (rl) return rl;

    const owner = await timing.timeStep("resolve_owner", () => getOwnerId());
    if (!owner) {
      return timing.attach(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }

    const ownerId = owner.ownerId;
    await timing.timeStep("assert_org_scope", () =>
      assertOrgScopeHasDataOrThrow(ownerId),
    );

    const payload = await timing.timeStep("route_cache", () =>
      cacheOwnerRoute({
        namespace: "dashboard-rollout",
        ownerId,
        load: async () => {
          const [orgRows, snapshotRows, keys] = await timing.timeStep(
            "load_rollout_dependencies",
            () =>
              Promise.all([
                runStep(timing, "organization", () =>
                  db
                    .select({ plan: organizations.plan })
                    .from(organizations)
                    .where(eq(organizations.id, ownerId))
                    .limit(1),
                ),
                runStep(timing, "operations_snapshot", () =>
                  db
                    .select()
                    .from(operationsSnapshots)
                    .where(eq(operationsSnapshots.orgId, ownerId))
                    .limit(1),
                ),
                owner.role === "admin"
                  ? runStep(timing, "api_keys", () =>
                      db
                        .select({
                          id: apiKeys.id,
                          name: apiKeys.name,
                          environment: apiKeys.environment,
                          keyPrefix: apiKeys.keyPrefix,
                          scopes: apiKeys.scopes,
                          lastUsedAt: apiKeys.lastUsedAt,
                          createdAt: apiKeys.createdAt,
                        })
                        .from(apiKeys)
                        .where(
                          and(eq(apiKeys.orgId, ownerId), isNull(apiKeys.revokedAt)),
                        )
                        .orderBy(apiKeys.createdAt),
                    )
                  : Promise.resolve([]),
              ]),
          );

          const org = orgRows[0];
          const snapshot = snapshotRows[0];
          if (!snapshot) {
            throw new Error(`Operations snapshot missing for ${ownerId}`);
          }

          return {
            generatedAt: new Date().toISOString(),
            operations: {
              generatedAt: new Date().toISOString(),
              summary: buildOperationalHealthSummary({
                plan: org?.plan ?? "free",
                activePolicies: snapshot.activePolicies,
                enforcedPolicies: snapshot.enforcedPolicies,
                blockingPolicies: snapshot.blockingPolicies,
                activeApiKeys: snapshot.activeApiKeys,
                activeInstances: snapshot.activeInstances,
                distinctVersions: snapshot.distinctVersions,
                lastPolicySyncAt: snapshot.lastPolicySyncAt?.toISOString() ?? null,
                lastTelemetryAt: snapshot.lastTelemetryAt?.toISOString() ?? null,
                totalToolCalls: snapshot.totalToolCalls,
                failedToolCalls: snapshot.failedToolCalls,
                workflowSessions30d: snapshot.workflowSessions30d,
                reviewedSessions30d: snapshot.reviewedSessions30d,
                approvedSessions30d: snapshot.approvedSessions30d,
                blockedSessions30d: snapshot.blockedSessions30d,
                requiredAuditEvents30d: snapshot.requiredAuditEvents30d,
                lastAuditAt: snapshot.lastAuditAt?.toISOString() ?? null,
              }),
            },
            access: {
              keyAccessRestricted: owner.role !== "admin",
              keys,
            },
          };
        },
      }),
    );

    return timing.attach(NextResponse.json(payload));
  } catch (error) {
    if (error instanceof OrgScopeMismatchError) {
      return timing.attach(
        NextResponse.json(
          {
            code: "org_scope_mismatch",
            error: error.message,
            ownerId: error.ownerId,
          },
          { status: 409 },
        ),
      );
    }

    if (error instanceof DashboardRolloutQueryError) {
      const detail = describeError(error.cause);
      console.error(
        `[dashboard.rollout] Failed at ${error.step}: ${detail}`,
        error.cause,
      );
      return timing.attach(
        NextResponse.json(
          {
            code: "dashboard_rollout_unavailable",
            error: error.message,
            step: error.step,
            detail,
          },
          { status: 500 },
        ),
      );
    }

    return timing.attach(
      NextResponse.json(
        {
          code: "dashboard_rollout_unavailable",
          error: "Failed to load dashboard rollout",
          detail: describeError(error),
        },
        { status: 500 },
      ),
    );
  }
}
