import { describe, expect, it } from "vitest";
import {
  createSchemaWarning,
  isRecoverableOperationsError,
} from "./summary";

describe("isRecoverableOperationsError", () => {
  it("treats missing relation errors as recoverable schema drift", () => {
    expect(
      isRecoverableOperationsError({
        code: "42P01",
        message: 'relation "workflow_snapshots" does not exist',
      }),
    ).toBe(true);
  });

  it("treats missing column errors as recoverable schema drift", () => {
    expect(
      isRecoverableOperationsError({
        code: "42703",
        message: 'column "severity" does not exist',
      }),
    ).toBe(true);
  });

  it("does not swallow unrelated runtime failures", () => {
    expect(
      isRecoverableOperationsError(new Error("database connection refused")),
    ).toBe(false);
  });
});

describe("createSchemaWarning", () => {
  it("keeps the underlying database signal for server logs", () => {
    expect(
      createSchemaWarning({
        code: "42P01",
        message: 'relation "reviews" does not exist',
      }),
    ).toEqual({
      code: "schema_unavailable",
      detail: '42P01: relation "reviews" does not exist',
    });
  });
});
