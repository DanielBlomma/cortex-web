import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey } from "./generate";

describe("generateApiKey", () => {
  it("returns rawKey, keyHash, and keyPrefix", () => {
    const result = generateApiKey();
    expect(result).toHaveProperty("rawKey");
    expect(result).toHaveProperty("keyHash");
    expect(result).toHaveProperty("keyPrefix");
  });

  it("rawKey starts with ctx_ prefix", () => {
    const { rawKey } = generateApiKey();
    expect(rawKey.startsWith("ctx_")).toBe(true);
  });

  it("rawKey is 36 chars (4 prefix + 32 random)", () => {
    const { rawKey } = generateApiKey();
    expect(rawKey.length).toBe(36);
  });

  it("keyPrefix is first 12 chars of rawKey", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(keyPrefix).toBe(rawKey.slice(0, 12));
  });

  it("keyHash is a valid SHA-256 hex string", () => {
    const { keyHash } = generateApiKey();
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keyHash matches hashApiKey(rawKey)", () => {
    const { rawKey, keyHash } = generateApiKey();
    expect(hashApiKey(rawKey)).toBe(keyHash);
  });

  it("generates unique keys each time", () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateApiKey().rawKey));
    expect(keys.size).toBe(50);
  });

  it("rawKey only contains base62 characters after prefix", () => {
    const { rawKey } = generateApiKey();
    const body = rawKey.slice(4);
    expect(body).toMatch(/^[0-9A-Za-z]+$/);
  });
});

describe("hashApiKey", () => {
  it("returns consistent hash for same input", () => {
    const hash1 = hashApiKey("ctx_test123");
    const hash2 = hashApiKey("ctx_test123");
    expect(hash1).toBe(hash2);
  });

  it("returns different hash for different input", () => {
    const hash1 = hashApiKey("ctx_aaa");
    const hash2 = hashApiKey("ctx_bbb");
    expect(hash1).not.toBe(hash2);
  });
});
