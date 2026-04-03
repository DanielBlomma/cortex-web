import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, organizations } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { generateApiKey } from "@/lib/api-keys/generate";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt)))
    .orderBy(apiKeys.createdAt);

  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const { orgId, userId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check plan limits
  const [org] = await db
    .select({ maxApiKeys: organizations.maxApiKeys })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (org) {
    const activeKeys = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt)));

    if (activeKeys.length >= org.maxApiKeys) {
      return NextResponse.json(
        {
          error: "API key limit reached",
          limit: org.maxApiKeys,
          current: activeKeys.length,
        },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const name = body.name || "Default";
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const [key] = await db
    .insert(apiKeys)
    .values({
      orgId,
      name,
      keyPrefix,
      keyHash,
      createdBy: userId,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    });

  return NextResponse.json({ key: { ...key, rawKey } }, { status: 201 });
}
