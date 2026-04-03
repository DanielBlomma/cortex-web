import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { hashApiKey } from "./generate";

export async function verifyApiKey(rawKey: string) {
  const hash = hashApiKey(rawKey);

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!key) return null;

  if (key.expiresAt && key.expiresAt < new Date()) return null;

  // Update last used timestamp (fire and forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .then(() => {});

  return key;
}
