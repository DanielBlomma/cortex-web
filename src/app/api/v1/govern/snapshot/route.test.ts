/**
 * Route-level tests for /api/v1/govern/snapshot.
 *
 * The full route depends on the database, Clerk auth, the rate-limiter,
 * and the runtime-schema bootstrapper. We mock every external dependency
 * at module level so each test exercises the route's own contract:
 *   - 500 (not 503) when CORTEX_SNAPSHOT_SIGNING_KEY is unset
 *   - signed JSON includes key_id and degraded flags
 *   - `?part=hosts|events` returns the strict-CSV slice
 *   - per-query timeout marks the response as degraded
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbCalls: Array<() => Promise<unknown>> = [];

// Build a chainable mock query that resolves to a configurable value.
// `pickResult(callIndex)` is called with the zero-based call index and
// returns the rows that query should yield (or a Promise to delay it).
let pickResult: (callIndex: number) => unknown | Promise<unknown> = () => [];
let callIndex = 0;

function makeChainable() {
  // Each terminal method returns a thenable so `await` works directly.
  // Capture the call index when the chain is awaited (not when built).
  let claimed = false;
  let idx = -1;
  function claim() {
    if (!claimed) {
      claimed = true;
      idx = callIndex++;
    }
    return idx;
  }
  // The proxy target is a function so it's callable, and the `apply`
  // trap returns the same proxy so chaining like `.from(...).where(...)`
  // keeps walking the same chainable. The `get` trap returns the proxy
  // for every property, except `then`, which surfaces a thenable that
  // resolves with the configured rows.
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
      select: () => {
        dbCalls.push(async () => undefined);
        return makeChainable();
      },
    };
  },
}));

vi.mock("@/db/schema", () => ({
  hostEnrollment: new Proxy(
    {},
    { get: () => ({}) as unknown },
  ),
  hookTamperEvent: new Proxy(
    {},
    { get: () => ({}) as unknown },
  ),
  ungovernedSessionEvent: new Proxy(
    {},
    { get: () => ({}) as unknown },
  ),
  managedSettingsAudit: new Proxy(
    {},
    { get: () => ({}) as unknown },
  ),
}));

vi.mock("drizzle-orm", () => ({
  and: () => undefined,
  desc: () => undefined,
  eq: () => undefined,
  gte: () => undefined,
  sql: Object.assign(
    (..._args: unknown[]) => undefined,
    {
      raw: () => undefined,
    },
  ),
}));

vi.mock("@/lib/rate-limit", () => ({
  applyRateLimit: () => null,
}));

vi.mock("@/lib/db/ensure-runtime-schema", () => ({
  ensureRuntimeSchema: async () => undefined,
}));

let getOwnerIdImpl: () => Promise<{ ownerId: string; userId: string; role: string } | null> =
  async () => ({ ownerId: "org_test", userId: "user_test", role: "admin" });

vi.mock("@/lib/auth/owner", () => ({
  getOwnerId: () => getOwnerIdImpl(),
}));

// Import AFTER mocks so the route picks them up.
const { GET } = await import("./route");
const { canonicalize } = await import("@/lib/govern/snapshot");
const { verifyHmac } = await import("@/lib/hmac");

beforeEach(() => {
  callIndex = 0;
  dbCalls.length = 0;
  pickResult = () => [];
  getOwnerIdImpl = async () => ({
    ownerId: "org_test",
    userId: "user_test",
    role: "admin",
  });
});

afterEach(() => {
  delete process.env.CORTEX_SNAPSHOT_SIGNING_KEY;
  delete process.env.CORTEX_SNAPSHOT_SIGNING_KEY_ID;
});

describe("GET /api/v1/govern/snapshot", () => {
  it("returns 500 (not 503) when CORTEX_SNAPSHOT_SIGNING_KEY is unset", async () => {
    delete process.env.CORTEX_SNAPSHOT_SIGNING_KEY;
    const res = await GET(new Request("http://x/api/v1/govern/snapshot?format=json"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Snapshot signing not configured/);
  });

  it("signs the JSON snapshot and includes key_id derived from secret", async () => {
    process.env.CORTEX_SNAPSHOT_SIGNING_KEY = "test-secret-abc";
    const res = await GET(new Request("http://x/api/v1/govern/snapshot?format=json"));
    expect(res.status).toBe(200);
    const signed = await res.json();
    expect(signed.signature_algorithm).toBe("HMAC-SHA256");
    expect(signed.key_id).toMatch(/^[a-f0-9]{8}$/);
    expect(signed.degraded).toBe(false);
    expect(signed.degraded_sections).toEqual([]);
    // Round-trip: re-canonicalize the body and verify the signature.
    const ok = verifyHmac(canonicalize(signed.body), "test-secret-abc", signed.signature);
    expect(ok).toBe(true);
  });

  it("uses CORTEX_SNAPSHOT_SIGNING_KEY_ID when set", async () => {
    process.env.CORTEX_SNAPSHOT_SIGNING_KEY = "test-secret-abc";
    process.env.CORTEX_SNAPSHOT_SIGNING_KEY_ID = "rot-2026-q2";
    const res = await GET(new Request("http://x/api/v1/govern/snapshot?format=json"));
    const signed = await res.json();
    expect(signed.key_id).toBe("rot-2026-q2");
  });

  it("?part=hosts returns a strict RFC-4180 hosts-only CSV (no #-comments, no ## sections)", async () => {
    pickResult = (i) => {
      // Index 0 is the hosts SELECT. Return one row.
      if (i === 0) {
        return [
          {
            hostId: "h1",
            os: "darwin",
            osVersion: null,
            governMode: "advisory",
            aiClisDetected: [],
            activeFrameworks: [],
            configVersion: null,
            firstSeen: null,
            lastSeen: null,
          },
        ];
      }
      return [];
    };
    const res = await GET(
      new Request("http://x/api/v1/govern/snapshot?format=csv&part=hosts"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    expect(res.headers.get("content-disposition")).toMatch(/-hosts\.csv/);
    const body = await res.text();
    expect(body).not.toMatch(/^#/m);
    expect(body).not.toContain("##");
    expect(body.startsWith("host_id,os,os_version")).toBe(true);
    expect(body.endsWith("\r\n")).toBe(true);
    expect(body).toContain("h1,darwin,");
  });

  it("?part=events returns a strict RFC-4180 events-only CSV", async () => {
    pickResult = () => [];
    const res = await GET(
      new Request("http://x/api/v1/govern/snapshot?format=csv&part=events"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/-events\.csv/);
    const body = await res.text();
    expect(body).not.toMatch(/^#/m);
    expect(body).not.toContain("##");
    expect(body.startsWith("category,detected_at,host_id")).toBe(true);
    expect(body.endsWith("\r\n")).toBe(true);
  });

  it("rejects invalid part values", async () => {
    const res = await GET(
      new Request("http://x/api/v1/govern/snapshot?format=csv&part=bogus"),
    );
    expect(res.status).toBe(400);
  });

  it("rejects part with format=json", async () => {
    const res = await GET(
      new Request("http://x/api/v1/govern/snapshot?format=json&part=hosts"),
    );
    expect(res.status).toBe(400);
  });

  it("marks the response degraded when one query exceeds the per-query budget", async () => {
    process.env.CORTEX_SNAPSHOT_SIGNING_KEY = "test-secret-abc";
    pickResult = (i) => {
      if (i === 0) {
        // Make the hosts query take much longer than the 5s budget.
        return new Promise((resolve) => setTimeout(() => resolve([]), 6500));
      }
      return [];
    };
    const res = await GET(new Request("http://x/api/v1/govern/snapshot?format=json"));
    expect(res.status).toBe(200);
    const signed = await res.json();
    expect(signed.degraded).toBe(true);
    expect(signed.degraded_sections).toContain("hosts");
  }, 10_000);
});
