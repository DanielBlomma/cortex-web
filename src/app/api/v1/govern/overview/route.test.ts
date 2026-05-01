/**
 * Route-level test for /api/v1/govern/overview.
 *
 * Mirrors snapshot/route.test.ts for the bits that matter here: a slow
 * query is bounded by the per-query budget, the response surfaces
 * `degraded: true` and the timed-out section name in `degraded_sections`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pickResult: (callIndex: number) => unknown | Promise<unknown> = () => [];
let callIndex = 0;

function makeChainable() {
  let claimed = false;
  let idx = -1;
  function claim() {
    if (!claimed) {
      claimed = true;
      idx = callIndex++;
    }
    return idx;
  }
  const handler: ProxyHandler<{ (): unknown }> = {
    apply() {
      return chainable;
    },
    get(_target, prop) {
      if (prop === "then") {
        return (
          onFulfilled: (v: unknown) => unknown,
          onRejected?: (r: unknown) => unknown,
        ) => {
          const i = claim();
          return Promise.resolve(pickResult(i)).then(onFulfilled, onRejected);
        };
      }
      return chainable;
    },
  };
  const chainable: unknown = new Proxy(function noop() {}, handler);
  return chainable;
}

vi.mock("@/db", () => ({
  get db() {
    return {
      select: () => makeChainable(),
    };
  },
}));

vi.mock("@/db/schema", () => ({
  hostEnrollment: new Proxy({}, { get: () => ({}) as unknown }),
  hookTamperEvent: new Proxy({}, { get: () => ({}) as unknown }),
  ungovernedSessionEvent: new Proxy({}, { get: () => ({}) as unknown }),
  managedSettingsAudit: new Proxy({}, { get: () => ({}) as unknown }),
}));

vi.mock("drizzle-orm", () => ({
  and: () => undefined,
  desc: () => undefined,
  eq: () => undefined,
  gte: () => undefined,
  sql: Object.assign((..._args: unknown[]) => undefined, { raw: () => undefined }),
}));

vi.mock("@/lib/rate-limit", () => ({
  applyRateLimit: () => null,
}));

vi.mock("@/lib/db/ensure-runtime-schema", () => ({
  ensureRuntimeSchema: async () => undefined,
}));

vi.mock("@/lib/auth/owner", () => ({
  getOwnerId: async () => ({
    ownerId: "org_test",
    userId: "user_test",
    role: "admin",
  }),
}));

const { GET } = await import("./route");

beforeEach(() => {
  callIndex = 0;
  pickResult = () => [];
});

afterEach(() => {
  pickResult = () => [];
});

describe("GET /api/v1/govern/overview", () => {
  it("returns degraded:false when all queries complete in time", async () => {
    const res = await GET(new Request("http://x/api/v1/govern/overview"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.degraded).toBe(false);
    expect(body.degraded_sections).toEqual([]);
  });

  it("marks the response degraded when one query exceeds the per-query budget", async () => {
    pickResult = (i) => {
      // Index 0 is the hosts SELECT; force it past the 5s budget.
      if (i === 0) {
        return new Promise((resolve) => setTimeout(() => resolve([]), 6500));
      }
      return [];
    };
    const res = await GET(new Request("http://x/api/v1/govern/overview"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.degraded).toBe(true);
    expect(body.degraded_sections).toContain("hosts");
  }, 10_000);
});
