import { describe, it, expect } from "vitest";
import { generateHmacSecret, computeHmac, verifyHmac } from "./hmac";

describe("generateHmacSecret", () => {
  it("returns a 64-char hex string (32 bytes)", () => {
    const secret = generateHmacSecret();
    expect(secret).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique secrets", () => {
    const secrets = new Set(Array.from({ length: 20 }, () => generateHmacSecret()));
    expect(secrets.size).toBe(20);
  });
});

describe("computeHmac", () => {
  it("returns a 64-char hex string", () => {
    const hmac = computeHmac("test payload", "secret123");
    expect(hmac).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for same input", () => {
    const a = computeHmac("payload", "secret");
    const b = computeHmac("payload", "secret");
    expect(a).toBe(b);
  });

  it("differs for different payloads", () => {
    const a = computeHmac("payload1", "secret");
    const b = computeHmac("payload2", "secret");
    expect(a).not.toBe(b);
  });

  it("differs for different secrets", () => {
    const a = computeHmac("payload", "secret1");
    const b = computeHmac("payload", "secret2");
    expect(a).not.toBe(b);
  });
});

describe("verifyHmac", () => {
  const secret = "test-secret-key";
  const payload = '{"data":"test"}';

  it("returns true for valid signature", () => {
    const hmac = computeHmac(payload, secret);
    const header = `sha256=${hmac}`;
    expect(verifyHmac(payload, secret, header)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    expect(verifyHmac(payload, secret, "sha256=0000000000000000000000000000000000000000000000000000000000000000")).toBe(false);
  });

  it("returns false for missing sha256= prefix", () => {
    const hmac = computeHmac(payload, secret);
    expect(verifyHmac(payload, secret, hmac)).toBe(false);
  });

  it("returns false for tampered payload", () => {
    const hmac = computeHmac(payload, secret);
    const header = `sha256=${hmac}`;
    expect(verifyHmac('{"data":"tampered"}', secret, header)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const hmac = computeHmac(payload, secret);
    const header = `sha256=${hmac}`;
    expect(verifyHmac(payload, "wrong-secret", header)).toBe(false);
  });

  it("returns false for wrong length signature", () => {
    expect(verifyHmac(payload, secret, "sha256=abcd")).toBe(false);
  });
});
