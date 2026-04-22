import { describe, expect, it } from "vitest";
import { reviewPushSchema } from "./review";

const validPayload = {
  reviews: [
    {
      policy_id: "require-code-review",
      pass: false,
      severity: "error" as const,
      message: "Code review is required before approval",
      reviewed_at: "2025-01-01T12:00:00Z",
    },
  ],
};

describe("reviewPushSchema", () => {
  it("accepts valid review payloads with attribution", () => {
    const result = reviewPushSchema.safeParse({
      repo: "my-app",
      instance_id: "abcdef1234567890",
      session_id: "session_12345678",
      ...validPayload,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid session_id format", () => {
    const result = reviewPushSchema.safeParse({
      session_id: "bad id",
      ...validPayload,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid instance_id format", () => {
    const result = reviewPushSchema.safeParse({
      instance_id: "not-hex",
      ...validPayload,
    });
    expect(result.success).toBe(false);
  });
});
