import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { hashApiKey } from "./generate";

const MAX_KEY_LENGTH = 100;

export async function verifyApiKey(rawKey: string) {
  if (!rawKey || rawKey.length > MAX_KEY_LENGTH || !rawKey.startsWith("ctx_")) {
    return null;
  }

  const hash = hashApiKey(rawKey);

  const [key] = await db
    .select({
      id: apiKeys.id,
      orgId: apiKeys.orgId,
      scopes: apiKeys.scopes,
      hmacSecret: apiKeys.hmacSecret,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!key) return null;

  if (key.expiresAt && key.expiresAt < new Date()) return null;

  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .catch(() => {
      // Non-critical: lastUsedAt update failure should not break the request
    });

  return key;
}
