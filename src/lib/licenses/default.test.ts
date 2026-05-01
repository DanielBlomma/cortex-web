/**
 * Tests for ensureDefaultLicense — the auto-grant helper that backs
 * the /api/v1/api-keys POST and /api/v1/license/verify routes.
 *
 * The helper has three paths we care about:
 *   1. License row already exists → return { created: false, reason: "already_exists" }
 *      and do NOT issue an INSERT.
 *   2. No license row, org row exists → INSERT a community-edition row
 *      using the org's name and maxRepos, with a far-future expiry.
 *   3. No license row, no org row → return { created: false, reason: "org_missing" }
 *      without throwing.
 *
 * We mock @/db with a tiny driver that captures select/insert calls and
 * returns scripted rows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Capture = {
  selectFromTables: string[];
  insertedTables: string[];
  insertedValues: unknown[];
};

const capture: Capture = {
  selectFromTables: [],
  insertedTables: [],
  insertedValues: [],
};

let selectQueue: unknown[][] = [];
let insertReturning: Array<{ id: string }> = [];

function makeSelect() {
  // .select(cols).from(table).where(...).limit(n) → resolves to rows.
  // We capture which table is queried to assert the query order.
  return {
    from(table: { __name__: string }) {
      capture.selectFromTables.push(table.__name__);
      const rows = selectQueue.shift() ?? [];
      const chain = {
        where() {
          return chain;
        },
        limit() {
          return Promise.resolve(rows);
        },
      };
      return chain;
    },
  };
}

function makeInsert(table: { __name__: string }) {
  return {
    values(v: unknown) {
      capture.insertedTables.push(table.__name__);
      capture.insertedValues.push(v);
      return {
        returning() {
          return Promise.resolve(insertReturning);
        },
      };
    },
  };
}

vi.mock("@/db", () => ({
  db: {
    select: () => makeSelect(),
    insert: (table: { __name__: string }) => makeInsert(table),
  },
}));

vi.mock("@/db/schema", () => ({
  licenses: {
    __name__: "licenses",
    id: "licenses.id",
    orgId: "licenses.org_id",
  },
  organizations: {
    __name__: "organizations",
    id: "organizations.id",
    name: "organizations.name",
    maxRepos: "organizations.max_repos",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: () => undefined,
}));

const { ensureDefaultLicense } = await import("./default");

beforeEach(() => {
  capture.selectFromTables = [];
  capture.insertedTables = [];
  capture.insertedValues = [];
  selectQueue = [];
  insertReturning = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ensureDefaultLicense", () => {
  it("is a no-op when the org already has a license row", async () => {
    selectQueue = [[{ id: "lic_existing" }]]; // licenses lookup returns 1 row

    const result = await ensureDefaultLicense("org_42");

    expect(result).toEqual({ created: false, reason: "already_exists" });
    // The org lookup must NOT have run, and no insert must have been issued.
    expect(capture.selectFromTables).toEqual(["licenses"]);
    expect(capture.insertedTables).toEqual([]);
  });

  it("inserts a community license row when the org has none", async () => {
    selectQueue = [
      [], // licenses lookup → empty
      [{ name: "Acme Co", maxRepos: 5 }], // organizations lookup
    ];
    insertReturning = [{ id: "lic_new" }];

    const fixedNow = new Date("2026-04-30T00:00:00Z");
    const result = await ensureDefaultLicense("org_42", {
      createdBy: "user_owner",
      now: fixedNow,
    });

    expect(result).toEqual({ created: true, licenseId: "lic_new" });
    expect(capture.selectFromTables).toEqual(["licenses", "organizations"]);
    expect(capture.insertedTables).toEqual(["licenses"]);

    const inserted = capture.insertedValues[0] as Record<string, unknown>;
    expect(inserted.orgId).toBe("org_42");
    expect(inserted.customer).toBe("Acme Co");
    expect(inserted.edition).toBe("community");
    expect(inserted.maxRepos).toBe(5); // mirrors org.maxRepos
    expect(inserted.features).toEqual([]);
    expect(inserted.status).toBe("active");
    expect(inserted.createdBy).toBe("user_owner");
    // expiresAt is YYYY-MM-DD, ten years out.
    expect(inserted.expiresAt).toBe("2036-04-30");
  });

  it("returns org_missing without inserting when the org row is gone", async () => {
    selectQueue = [
      [], // licenses lookup → empty
      [], // organizations lookup → empty
    ];

    const result = await ensureDefaultLicense("org_ghost");

    expect(result).toEqual({ created: false, reason: "org_missing" });
    expect(capture.insertedTables).toEqual([]);
  });

  it("defaults createdBy to null when not provided", async () => {
    selectQueue = [
      [],
      [{ name: "Solo Dev", maxRepos: 3 }],
    ];
    insertReturning = [{ id: "lic_solo" }];

    await ensureDefaultLicense("org_solo");

    const inserted = capture.insertedValues[0] as Record<string, unknown>;
    expect(inserted.createdBy).toBeNull();
  });
});
