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

  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response("Failed to read body", { status: 400 });
  }

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
      const emailAddresses = data.email_addresses as
        | Array<{ email_address: string }>
        | undefined;
      const email = emailAddresses?.[0]?.email_address;
      if (!email) break;

      await db
        .insert(users)
        .values({
          id: data.id as string,
          email,
          name:
            `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || null,
          avatarUrl: (data.image_url as string) || null,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email,
            name:
              `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || null,
            avatarUrl: (data.image_url as string) || null,
            updatedAt: new Date(),
          },
        });
      break;
    }

    case "user.deleted": {
      if (data.id) {
        await db.delete(users).where(eq(users.id, data.id as string));
      }
      break;
    }

    case "organization.created":
    case "organization.updated": {
      const name = data.name as string | undefined;
      const slug = data.slug as string | undefined;
      if (!data.id || !name || !slug) break;

      await db
        .insert(organizations)
        .values({
          id: data.id as string,
          name,
          slug,
        })
        .onConflictDoUpdate({
          target: organizations.id,
          set: { name, slug, updatedAt: new Date() },
        });
      break;
    }

    case "organization.deleted": {
      if (data.id) {
        await db
          .delete(organizations)
          .where(eq(organizations.id, data.id as string));
      }
      break;
    }

    case "organizationMembership.created":
    case "organizationMembership.updated": {
      const orgData = data.organization as { id: string } | undefined;
      const userData = data.public_user_data as
        | { user_id: string }
        | undefined;
      if (!orgData?.id || !userData?.user_id) break;

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
      const orgData = data.organization as { id: string } | undefined;
      const userData = data.public_user_data as
        | { user_id: string }
        | undefined;
      if (!orgData?.id || !userData?.user_id) break;

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
