import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys, organizations } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { generateApiKey } from "@/lib/api-keys/generate";
import { generateHmacSecret } from "@/lib/hmac";
import { getOwnerId } from "@/lib/auth/owner";
import { logAudit } from "@/lib/audit/log";
import { invalidateOwnerRouteCache } from "@/lib/cache/owner-route-cache";
import { refreshOperationsSnapshot } from "@/lib/operations/snapshot";
import { applyRateLimit } from "@/lib/rate-limit";
import { ensureDefaultLicense } from "@/lib/licenses/default";

const AVAILABLE_SCOPES = ["telemetry", "policy", "govern"] as const;
const ENVIRONMENT_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

const createKeySchema = z.object({
  name: z.string().min(1).max(100).default("Default"),
  environment: z
    .string()
    .min(1)
    .max(32)
    .regex(
      ENVIRONMENT_RE,
      "Environment must be lowercase alphanumeric and may include hyphens"
    )
    .default("production"),
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
  if (owner.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can view API keys" },
      { status: 403 }
    );
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      environment: apiKeys.environment,
      keyPrefix: apiKeys.keyPrefix,
      rawKey: apiKeys.rawKey,
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
  if (owner.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can create API keys" },
      { status: 403 }
    );
  }

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

  const { environment, name, scopes } = parsed.data;
  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  const hmacSecret = generateHmacSecret();

  const [key] = await db
    .insert(apiKeys)
    .values({
      orgId: owner.ownerId,
      name,
      environment,
      keyPrefix,
      keyHash,
      rawKey,
      hmacSecret,
      scopes,
      createdBy: owner.userId,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      environment: apiKeys.environment,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    });

  // Auto-grant a community-edition license on first key creation so the
  // CLI's `cortex enterprise <key>` flow can verify successfully without
  // a separate provisioning step. Idempotent — existing licenses (paid
  // or otherwise) are left untouched. Failures are logged but
  // non-fatal: the key insert above already succeeded, and the verify
  // route has its own self-heal fallback for orgs lacking a row.
  try {
    await ensureDefaultLicense(owner.ownerId, { createdBy: owner.userId });
  } catch (err) {
    console.error("ensureDefaultLicense failed for", owner.ownerId, err);
  }

  await refreshOperationsSnapshot(owner.ownerId);
  await invalidateOwnerRouteCache(owner.ownerId);

  logAudit({
    orgId: owner.ownerId,
    userId: owner.userId,
    action: "create",
    resourceType: "api_key",
    resourceId: key.id,
    description: `Created API key "${name}" for ${environment}`,
    metadata: { environment, scopes },
    req,
  });

  return NextResponse.json({ key: { ...key, rawKey, hmacSecret } }, { status: 201 });
}
