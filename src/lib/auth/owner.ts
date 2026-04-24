import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  normalizeDashboardRole,
  type DashboardRole,
} from "@/lib/auth/role";

/**
 * Returns the orgId to scope data queries and ensures the
 * corresponding org + user rows exist in the DB for FK constraints.
 */
export async function getOwnerId(): Promise<{
  ownerId: string;
  userId: string;
  role: DashboardRole;
} | null> {
  const { orgId, orgRole, orgSlug, userId } = await auth();

  if (!userId) return null;

  const ownerId = orgId ?? `personal_${userId}`;
  let orgName = orgId ? "Organization" : "Personal";
  let resolvedOrgSlug = orgId ? orgSlug ?? ownerId : ownerId;

  if (orgId) {
    try {
      const client = await clerkClient();
      const organization = await client.organizations.getOrganization({
        organizationId: orgId,
      });
      orgName = organization.name || orgName;
      resolvedOrgSlug = organization.slug || resolvedOrgSlug;
    } catch {
      // Fall back to auth() data if Clerk org lookup fails.
    }
  }

  // Ensure org row exists
  const [existingOrg] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(eq(organizations.id, ownerId))
    .limit(1);

  if (!existingOrg) {
    await db
      .insert(organizations)
      .values({
        id: ownerId,
        name: orgName,
        slug: resolvedOrgSlug,
      })
      .onConflictDoNothing();
  } else if (
    existingOrg.name !== orgName ||
    existingOrg.slug !== resolvedOrgSlug
  ) {
    await db
      .update(organizations)
      .set({
        name: orgName,
        slug: resolvedOrgSlug,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, ownerId));
  }

  // Ensure user row exists
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existingUser) {
    const clerkUser = await currentUser();
    await db
      .insert(users)
      .values({
        id: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? "unknown",
        name: clerkUser?.fullName ?? null,
      })
      .onConflictDoNothing();
  }

  if (!orgId) {
    return { ownerId, userId, role: "admin" };
  }

  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.orgId, ownerId), eq(memberships.userId, userId)))
    .limit(1);

  return {
    ownerId,
    userId,
    role: normalizeDashboardRole(membership?.role ?? orgRole),
  };
}
