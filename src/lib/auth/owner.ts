import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Returns the orgId to scope data queries and ensures the
 * corresponding org + user rows exist in the DB for FK constraints.
 */
export async function getOwnerId(): Promise<{
  ownerId: string;
  userId: string;
} | null> {
  const { orgId, userId } = await auth();

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

  return { ownerId, userId };
}
