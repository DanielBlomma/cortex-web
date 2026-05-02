import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apiKeys,
  auditLog,
  memberships,
  organizations,
  policies,
  policyViolations,
  reviews,
  telemetryEvents,
  workflowSnapshots,
} from "@/db/schema";

export type OrgScopeSuggestion = {
  ownerId: string;
  name: string;
  slug: string;
  telemetryEvents: number;
  auditEvents: number;
  violationCount: number;
  reviewCount: number;
  workflowCount: number;
  apiKeyCount: number;
  policyCount: number;
  totalSignals: number;
};

export class OrgScopeMismatchError extends Error {
  constructor(
    public ownerId: string,
    public availableScopes: OrgScopeSuggestion[] = [],
  ) {
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

async function listAccessibleScopesWithData(
  userId: string,
  excludeOwnerId: string,
): Promise<OrgScopeSuggestion[]> {
  const accessibleScopes = await db
    .select({
      ownerId: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(
      and(
        eq(memberships.userId, userId),
        ne(memberships.orgId, excludeOwnerId),
      ),
    );

  if (accessibleScopes.length === 0) return [];

  const scopeIds = accessibleScopes.map((scope) => scope.ownerId);

  const [
    apiKeyRows,
    policyRows,
    telemetryRows,
    auditRows,
    violationRows,
    reviewRows,
    workflowRows,
  ] = await Promise.all([
    db
      .select({
        ownerId: apiKeys.orgId,
        count: sql<number>`count(*)`,
      })
      .from(apiKeys)
      .where(and(inArray(apiKeys.orgId, scopeIds), isNull(apiKeys.revokedAt)))
      .groupBy(apiKeys.orgId),
    db
      .select({
        ownerId: policies.orgId,
        count: sql<number>`count(*)`,
      })
      .from(policies)
      .where(inArray(policies.orgId, scopeIds))
      .groupBy(policies.orgId),
    db
      .select({
        ownerId: telemetryEvents.orgId,
        count: sql<number>`count(*)`,
      })
      .from(telemetryEvents)
      .where(inArray(telemetryEvents.orgId, scopeIds))
      .groupBy(telemetryEvents.orgId),
    db
      .select({
        ownerId: auditLog.orgId,
        count: sql<number>`count(*)`,
      })
      .from(auditLog)
      .where(inArray(auditLog.orgId, scopeIds))
      .groupBy(auditLog.orgId),
    db
      .select({
        ownerId: policyViolations.orgId,
        count: sql<number>`count(*)`,
      })
      .from(policyViolations)
      .where(inArray(policyViolations.orgId, scopeIds))
      .groupBy(policyViolations.orgId),
    db
      .select({
        ownerId: reviews.orgId,
        count: sql<number>`count(*)`,
      })
      .from(reviews)
      .where(inArray(reviews.orgId, scopeIds))
      .groupBy(reviews.orgId),
    db
      .select({
        ownerId: workflowSnapshots.orgId,
        count: sql<number>`count(*)`,
      })
      .from(workflowSnapshots)
      .where(inArray(workflowSnapshots.orgId, scopeIds))
      .groupBy(workflowSnapshots.orgId),
  ]);

  const toCountMap = (rows: Array<{ ownerId: string; count: number }>) =>
    new Map(rows.map((row) => [row.ownerId, Number(row.count)]));

  const apiKeyCounts = toCountMap(apiKeyRows);
  const policyCounts = toCountMap(policyRows);
  const telemetryCounts = toCountMap(telemetryRows);
  const auditCounts = toCountMap(auditRows);
  const violationCounts = toCountMap(violationRows);
  const reviewCounts = toCountMap(reviewRows);
  const workflowCounts = toCountMap(workflowRows);

  return accessibleScopes
    .map((scope) => {
      const telemetryEvents = telemetryCounts.get(scope.ownerId) ?? 0;
      const auditEvents = auditCounts.get(scope.ownerId) ?? 0;
      const violationCount = violationCounts.get(scope.ownerId) ?? 0;
      const reviewCount = reviewCounts.get(scope.ownerId) ?? 0;
      const workflowCount = workflowCounts.get(scope.ownerId) ?? 0;
      const apiKeyCount = apiKeyCounts.get(scope.ownerId) ?? 0;
      const policyCount = policyCounts.get(scope.ownerId) ?? 0;
      const totalSignals =
        telemetryEvents +
        auditEvents +
        violationCount +
        reviewCount +
        workflowCount +
        apiKeyCount +
        policyCount;

      return {
        ownerId: scope.ownerId,
        name: scope.name,
        slug: scope.slug,
        telemetryEvents,
        auditEvents,
        violationCount,
        reviewCount,
        workflowCount,
        apiKeyCount,
        policyCount,
        totalSignals,
      };
    })
    .filter((scope) => scope.totalSignals > 0)
    .sort((left, right) => right.totalSignals - left.totalSignals)
    .slice(0, 5);
}

export async function assertOrgScopeHasDataOrThrow(
  ownerId: string,
  userId?: string,
) {
  const currentScopeRows = await countForScope(ownerId);
  if (currentScopeRows > 0) return;

  const otherScopeRows = await countForScope(ownerId, true);
  if (otherScopeRows > 0) {
    const availableScopes = userId
      ? await listAccessibleScopesWithData(userId, ownerId)
      : [];
    throw new OrgScopeMismatchError(ownerId, availableScopes);
  }
}
