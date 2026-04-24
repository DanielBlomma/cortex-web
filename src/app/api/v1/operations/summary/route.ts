import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  operationsSnapshots,
  organizations,
} from "@/db/schema";
import { buildOperationalHealthSummary } from "@/lib/operations/health";
import {
  assertOrgScopeHasDataOrThrow,
  OrgScopeMismatchError,
} from "@/lib/org-scope";
import { getOwnerId } from "@/lib/auth/owner";
import { applyRateLimit } from "@/lib/rate-limit";
import { createRequestTiming } from "@/lib/perf/request-timing";
import { cacheOwnerRoute } from "@/lib/cache/owner-route-cache";

class OperationsSummaryQueryError extends Error {
  constructor(
    public step: string,
    public cause: unknown,
  ) {
    super(`Failed to build operations summary at ${step}`);
    this.name = "OperationsSummaryQueryError";
  }
}

function rootCause(error: unknown): unknown {
  let current = error;

  while (
    typeof current === "object" &&
    current !== null &&
    "cause" in current &&
    current.cause
  ) {
    current = current.cause;
  }

  return current;
}

function describeError(error: unknown): string {
  const resolved = rootCause(error);

  if (
    typeof resolved === "object" &&
    resolved !== null &&
    "message" in resolved &&
    typeof resolved.message === "string"
  ) {
    const code =
      "code" in resolved && typeof resolved.code === "string"
        ? resolved.code
        : null;
    return code ? `${code}: ${resolved.message}` : resolved.message;
  }

  if (resolved instanceof Error) {
    return resolved.message;
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
    throw new OperationsSummaryQueryError(step, error);
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
        namespace: "operations-summary",
        ownerId,
        load: async () => {
          const [orgRows, snapshotRows] = await timing.timeStep(
            "load_summary_dependencies",
            () =>
              Promise.all([
                runStep(timing, "organization", () =>
                  db
                    .select({ plan: organizations.plan })
                    .from(organizations)
                    .where(eq(organizations.id, ownerId))
                    .limit(1),
                ),
                runStep(timing, "operations_snapshots", () =>
                  db
                    .select()
                    .from(operationsSnapshots)
                    .where(eq(operationsSnapshots.orgId, ownerId))
                    .limit(1),
                ),
              ]),
          );

          const org = orgRows[0];
          const snapshot = snapshotRows[0];

          if (!snapshot) {
            throw new Error(`Operations snapshot missing for ${ownerId}`);
          }

          return {
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
          };
        },
      }),
    );

    return timing.attach(
      NextResponse.json(payload),
    );
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

    if (error instanceof OperationsSummaryQueryError) {
      const detail = describeError(error.cause);
      console.error(
        `[operations.summary] Failed at ${error.step}: ${detail}`,
        error.cause,
      );
      return timing.attach(
        NextResponse.json(
          {
            code: "summary_unavailable",
            error: error.message,
            step: error.step,
            detail,
          },
          { status: 500 },
        ),
      );
    }

    console.error("[operations.summary] Failed to build operations summary", error);
    return timing.attach(
      NextResponse.json(
        {
          code: "summary_unavailable",
          error: "Failed to build operations summary",
          detail: describeError(error),
        },
        { status: 500 },
      ),
    );
  }
}
