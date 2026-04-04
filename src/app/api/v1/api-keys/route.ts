import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys, organizations } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { generateApiKey } from "@/lib/api-keys/generate";
import { getOwnerId } from "@/lib/auth/owner";
import { logAudit } from "@/lib/audit/log";
import { applyRateLimit } from "@/lib/rate-limit";

const AVAILABLE_SCOPES = ["telemetry", "policy", "audit-log"] as const;

const createKeySchema = z.object({
  name: z.string().min(1).max(100).default("Default"),
  scopes: z
    .array(z.enum(AVAILABLE_SCOPES))
    .min(1, "Select at least one scope")
    .default(["telemetry", "policy"]),
});

export async function GET(req: Request) {
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    .where(and(eq(apiKeys.orgId, owner.ownerId), isNull(apiKeys.revokedAt)))
    .orderBy(apiKeys.createdAt);

  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const rl = applyRateLimit(req, 10);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check plan limits
  const [org] = await db
    .select({ maxApiKeys: organizations.maxApiKeys })
    .from(organizations)
    .where(eq(organizations.id, owner.ownerId));

  if (org) {
    const activeKeys = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.orgId, owner.ownerId), isNull(apiKeys.revokedAt)));

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, scopes } = parsed.data;
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const [key] = await db
    .insert(apiKeys)
    .values({
      orgId: owner.ownerId,
      name,
      keyPrefix,
      keyHash,
      rawKey,
      scopes,
      createdBy: owner.userId,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    });

  logAudit({
    orgId: owner.ownerId,
    userId: owner.userId,
    action: "create",
    resourceType: "api_key",
    resourceId: key.id,
    description: `Created API key "${name}"`,
    metadata: { scopes },
    req,
  });

  return NextResponse.json({ key: { ...key, rawKey } }, { status: 201 });
}
