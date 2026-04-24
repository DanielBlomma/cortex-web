import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apiKeys,
  auditLog,
  policies,
  policyViolations,
  reviews,
  telemetryEvents,
  workflowSnapshots,
} from "@/db/schema";

export class OrgScopeMismatchError extends Error {
  constructor(public ownerId: string) {
    super(
      "Selected organization has no Cortex data, but data exists for another organization in this environment.",
    );
    this.name = "OrgScopeMismatchError";
  }
}

async function countForScope(ownerId: string, other = false): Promise<number> {
  const orgFilter = other ? ne : eq;

  const [
    keyRow,
    policyRow,
    telemetryRow,
    auditRow,
    violationRow,
    reviewRow,
    workflowRow,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(apiKeys)
      .where(
        and(orgFilter(apiKeys.orgId, ownerId), isNull(apiKeys.revokedAt)),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(policies)
      .where(orgFilter(policies.orgId, ownerId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(telemetryEvents)
      .where(orgFilter(telemetryEvents.orgId, ownerId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(orgFilter(auditLog.orgId, ownerId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(policyViolations)
      .where(orgFilter(policyViolations.orgId, ownerId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(orgFilter(reviews.orgId, ownerId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(workflowSnapshots)
      .where(orgFilter(workflowSnapshots.orgId, ownerId)),
  ]);

  return [
    Number(keyRow[0]?.count ?? 0),
    Number(policyRow[0]?.count ?? 0),
    Number(telemetryRow[0]?.count ?? 0),
    Number(auditRow[0]?.count ?? 0),
    Number(violationRow[0]?.count ?? 0),
    Number(reviewRow[0]?.count ?? 0),
    Number(workflowRow[0]?.count ?? 0),
  ].reduce((total, count) => total + count, 0);
}

export async function assertOrgScopeHasDataOrThrow(ownerId: string) {
  const currentScopeRows = await countForScope(ownerId);
  if (currentScopeRows > 0) return;

  const otherScopeRows = await countForScope(ownerId, true);
  if (otherScopeRows > 0) {
    throw new OrgScopeMismatchError(ownerId);
  }
}
