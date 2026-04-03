import { randomBytes, createHash } from "crypto";

const PREFIX = "ctx_";
const KEY_BYTES = 32;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function toBase62(buffer: Buffer): string {
  let result = "";
  for (const byte of buffer) {
    result += BASE62[byte % 62];
  }
  return result;
}

export function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const raw = toBase62(randomBytes(KEY_BYTES));
  const rawKey = `${PREFIX}${raw}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);
  return { rawKey, keyHash, keyPrefix };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
