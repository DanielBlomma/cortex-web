import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Generate a random HMAC secret (32 bytes, hex-encoded).
 */
export function generateHmacSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Compute HMAC-SHA256 of a payload using the given secret.
 */
export function computeHmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify a request's X-Cortex-Signature header against the body.
 * Returns true if valid, false if invalid.
 *
 * Header format: sha256=<hex>
 */
export function verifyHmac(
  payload: string,
  secret: string,
  signatureHeader: string
): boolean {
  if (!signatureHeader.startsWith("sha256=")) return false;

  const received = signatureHeader.slice(7);
  const expected = computeHmac(payload, secret);

  if (received.length !== expected.length) return false;

  return timingSafeEqual(
    Buffer.from(received, "hex"),
    Buffer.from(expected, "hex")
  );
}
