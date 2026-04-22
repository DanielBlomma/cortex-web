import { auth, currentUser } from "@clerk/nextjs/server";
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
  const { orgId, orgRole, userId } = await auth();

  if (!userId) return null;

  const ownerId = orgId ?? `personal_${userId}`;

  // Ensure org row exists
  const [existingOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, ownerId))
    .limit(1);

  if (!existingOrg) {
    await db.insert(organizations).values({
      id: ownerId,
      name: orgId ? "Organization" : "Personal",
      slug: ownerId,
    });
  }

  // Ensure user row exists
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existingUser) {
    const clerkUser = await currentUser();
    await db.insert(users).values({
      id: userId,
      email: clerkUser?.emailAddresses[0]?.emailAddress ?? "unknown",
      name: clerkUser?.fullName ?? null,
    });
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
