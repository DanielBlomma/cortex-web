import { db } from "@/db";
import { licenses, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Default community-edition license bootstrap.
 *
 * The licenses table is the single source of truth that
 * /api/v1/license/verify reads when a Cortex client (CLI, MCP server)
 * checks whether enterprise features should activate. Without a row,
 * `verify` returns `{ valid: false, reason: "no_license" }` and the CLI
 * refuses to write `enterprise.yml`.
 *
 * To make `cortex enterprise <key>` work end-to-end on a brand-new org,
 * we auto-grant a permissive community license the first time an API
 * key is created (or, as a safety net, the first time `verify` is called
 * for an org that doesn't yet have a row — covering orgs that pre-date
 * this fix).
 *
 * Defaults are deliberately permissive:
 *   - edition: "community" — the lowest tier; gates nothing extra.
 *   - max_repos: mirrors organizations.maxRepos (defaults to 3 for free
 *     plans) so the license matches the plan limit.
 *   - features: empty — community has no premium features.
 *   - expires_at: 10 years out — community plans don't expire on their
 *     own; only paid editions manage expiry. Setting a far-future date
 *     keeps the existing expiry-check code path simple (no nullable
 *     expires_at) without effectively expiring anything.
 *
 * The function is idempotent: if a license row already exists for the
 * org (regardless of edition/status) it returns early without
 * modification. Paid editions managed by the billing flow will not be
 * downgraded by this helper.
 */

const COMMUNITY_EXPIRY_YEARS = 10;

function communityExpiryDate(now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() + COMMUNITY_EXPIRY_YEARS);
  // licenses.expiresAt is a `date` column — store as YYYY-MM-DD.
  return d.toISOString().slice(0, 10);
}

export type EnsureDefaultLicenseResult =
  | { created: true; licenseId: string }
  | { created: false; reason: "already_exists" | "org_missing" };

/**
 * Ensure the given org has at least one license row. If none exists,
 * insert a community-edition row using the org's name as the customer
 * label. Existing rows (any edition, any status) are left untouched.
 */
export async function ensureDefaultLicense(
  orgId: string,
  options: { createdBy?: string | null; now?: Date } = {},
): Promise<EnsureDefaultLicenseResult> {
  const [existing] = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(eq(licenses.orgId, orgId))
    .limit(1);

  if (existing) {
    return { created: false, reason: "already_exists" };
  }

  const [org] = await db
    .select({ name: organizations.name, maxRepos: organizations.maxRepos })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) {
    // Defensive: an api-key insert just succeeded against this org via
    // FK, so this should be unreachable. Treat it as a no-op rather than
    // throwing — the verify path will surface the missing-license state.
    return { created: false, reason: "org_missing" };
  }

  const [row] = await db
    .insert(licenses)
    .values({
      orgId,
      customer: org.name,
      edition: "community",
      maxRepos: org.maxRepos,
      features: [],
      status: "active",
      expiresAt: communityExpiryDate(options.now),
      createdBy: options.createdBy ?? null,
    })
    .returning({ id: licenses.id });

  return { created: true, licenseId: row.id };
}
