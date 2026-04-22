import { describe, expect, it } from "vitest";
import { auditPushSchema } from "./audit";

const validPayload = {
  repo: "cortex-enterprise",
  instance_id: "instance-123",
  session_id: "session-123",
  events: [
    {
      timestamp: "2026-04-21T10:00:00Z",
      tool: "workflow.plan",
      input: { task_count: 3 },
      result_count: 1,
      entities_returned: [],
      rules_applied: [],
      duration_ms: 12,
      status: "success" as const,
      event_type: "workflow_transition" as const,
      evidence_level: "required" as const,
      resource_type: "workflow",
      metadata: { phase: "planning" },
    },
  ],
};

describe("auditPushSchema", () => {
  it("accepts valid audit payloads", () => {
    expect(auditPushSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects oversized batches", () => {
    const payload = {
      ...validPayload,
      events: Array.from({ length: 101 }, () => validPayload.events[0]),
    };
    expect(auditPushSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects invalid evidence level", () => {
    const payload = {
      ...validPayload,
      events: [{ ...validPayload.events[0], evidence_level: "high" }],
    };
    expect(auditPushSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects raw query-like keys in audit input", () => {
    const payload = {
      ...validPayload,
      events: [
        {
          ...validPayload.events[0],
          input: {
            query: "show me src/auth.ts",
          },
        },
      ],
    };
    expect(auditPushSchema.safeParse(payload).success).toBe(false);
  });

  it("accepts redacted query-like keys in audit input and metadata", () => {
    const payload = {
      ...validPayload,
      events: [
        {
          ...validPayload.events[0],
          input: {
            query: {
              type: "string",
              length: 21,
              redacted: true,
            },
            top_k: 5,
          },
          metadata: {
            prompt: {
              type: "string",
              length: 17,
              redacted: true,
            },
            nested: {
              content: {
                type: "string",
                length: 12,
                redacted: true,
              },
            },
          },
        },
      ],
    };
    expect(auditPushSchema.safeParse(payload).success).toBe(true);
  });
});
