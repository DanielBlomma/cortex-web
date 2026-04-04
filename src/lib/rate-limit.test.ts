import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyRateLimit } from "./rate-limit";

function makeRequest(ip = "127.0.0.1", path = "/api/test"): Request {
  return new Request(`http://localhost:3000${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

describe("applyRateLimit", () => {
  beforeEach(() => {
    // Advance time to clear previous entries
    vi.useFakeTimers();
    vi.advanceTimersByTime(120_000);
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const req = makeRequest("10.0.0.1", "/api/rl-test-1");
    const result = applyRateLimit(req, 5);
    expect(result).toBeNull();
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 3; i++) {
      const res = applyRateLimit(makeRequest("10.0.0.2", "/api/rl-test-2"), 3);
      if (i < 3) expect(res).toBeNull();
    }
    const blocked = applyRateLimit(makeRequest("10.0.0.2", "/api/rl-test-2"), 3);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("returns Retry-After header when blocked", async () => {
    for (let i = 0; i < 2; i++) {
      applyRateLimit(makeRequest("10.0.0.3", "/api/rl-test-3"), 2);
    }
    const blocked = applyRateLimit(makeRequest("10.0.0.3", "/api/rl-test-3"), 2);
    expect(blocked).not.toBeNull();
    const body = await blocked!.json();
    expect(body.error).toBe("Too many requests");
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
    expect(blocked!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("uses different buckets for different IPs", () => {
    for (let i = 0; i < 2; i++) {
      applyRateLimit(makeRequest("10.0.0.4", "/api/rl-test-4"), 2);
    }
    // Same path, different IP — should be allowed
    const result = applyRateLimit(makeRequest("10.0.0.5", "/api/rl-test-4"), 2);
    expect(result).toBeNull();
  });

  it("uses different buckets for different paths", () => {
    for (let i = 0; i < 2; i++) {
      applyRateLimit(makeRequest("10.0.0.6", "/api/rl-path-a"), 2);
    }
    // Same IP, different path — should be allowed
    const result = applyRateLimit(makeRequest("10.0.0.6", "/api/rl-path-b"), 2);
    expect(result).toBeNull();
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 2; i++) {
      applyRateLimit(makeRequest("10.0.0.7", "/api/rl-test-5"), 2);
    }
    const blocked = applyRateLimit(makeRequest("10.0.0.7", "/api/rl-test-5"), 2);
    expect(blocked).not.toBeNull();

    // Advance past the window
    vi.advanceTimersByTime(61_000);

    const allowed = applyRateLimit(makeRequest("10.0.0.7", "/api/rl-test-5"), 2);
    expect(allowed).toBeNull();
    vi.useRealTimers();
  });

  it("falls back to 'unknown' when no IP headers", () => {
    const req = new Request("http://localhost:3000/api/rl-test-6");
    const result = applyRateLimit(req, 100);
    expect(result).toBeNull();
  });
});
