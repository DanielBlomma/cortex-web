import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, 60_000).unref?.();
}

function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now >= entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return {
      limited: true,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { limited: false, remaining: limit - entry.count };
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Check rate limit for a request. Returns a 429 NextResponse if rate-limited,
 * or null if the request is allowed.
 *
 * @param req    - The incoming request
 * @param limit  - Max requests per window (default 60)
 * @param windowMs - Window duration in ms (default 60_000 = 1 minute)
 */
export function applyRateLimit(
  req: Request,
  limit = 60,
  windowMs = 60_000
): NextResponse | null {
  const ip = getClientIp(req);
  const path = new URL(req.url).pathname;
  const key = `${ip}:${path}`;
  const result = checkRateLimit(key, limit, windowMs);

  if (result.limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
