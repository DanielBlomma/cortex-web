import { randomBytes, createHash } from "crypto";

const PREFIX = "ctx_";
const KEY_LENGTH = 32;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function toBase62(length: number): string {
  let result = "";
  while (result.length < length) {
    const bytes = randomBytes(length - result.length);
    for (const byte of bytes) {
      // Reject 248-255 to avoid modulo bias (248 = 62 * 4)
      if (byte < 248 && result.length < length) {
        result += BASE62[byte % 62];
      }
    }
  }
  return result;
}

export function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const raw = toBase62(KEY_LENGTH);
  const rawKey = `${PREFIX}${raw}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);
  return { rawKey, keyHash, keyPrefix };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
