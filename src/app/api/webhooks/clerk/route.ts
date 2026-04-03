import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@/db";
import { organizations, users, memberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: { type: string; data: Record<string, unknown> };

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof evt;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = evt;

  switch (type) {
    case "user.created":
    case "user.updated": {
      const email =
        (data.email_addresses as Array<{ email_address: string }>)?.[0]
          ?.email_address ?? "";
      await db
        .insert(users)
        .values({
          id: data.id as string,
          email,
          name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || null,
          avatarUrl: (data.image_url as string) || null,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email,
            name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || null,
            avatarUrl: (data.image_url as string) || null,
            updatedAt: new Date(),
          },
        });
      break;
    }

    case "user.deleted": {
      await db.delete(users).where(eq(users.id, data.id as string));
      break;
    }

    case "organization.created":
    case "organization.updated": {
      await db
        .insert(organizations)
        .values({
          id: data.id as string,
          name: data.name as string,
          slug: data.slug as string,
        })
        .onConflictDoUpdate({
          target: organizations.id,
          set: {
            name: data.name as string,
            slug: data.slug as string,
            updatedAt: new Date(),
          },
        });
      break;
    }

    case "organization.deleted": {
      await db
        .delete(organizations)
        .where(eq(organizations.id, data.id as string));
      break;
    }

    case "organizationMembership.created":
    case "organizationMembership.updated": {
      const orgData = data.organization as { id: string };
      const userData = data.public_user_data as { user_id: string };
      await db
        .insert(memberships)
        .values({
          orgId: orgData.id,
          userId: userData.user_id,
          role: data.role as string,
        })
        .onConflictDoUpdate({
          target: [memberships.orgId, memberships.userId],
          set: { role: data.role as string },
        });
      break;
    }

    case "organizationMembership.deleted": {
      const orgData = data.organization as { id: string };
      const userData = data.public_user_data as { user_id: string };
      await db
        .delete(memberships)
        .where(
          and(
            eq(memberships.orgId, orgData.id),
            eq(memberships.userId, userData.user_id)
          )
        );
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
