import { describe, expect, it } from "vitest";
import { workflowPushSchema } from "./workflow";

const validPayload = {
  repo: "cortex-enterprise",
  instance_id: "abcdef1234567890",
  session_id: "session_12345678",
  workflow: {
    version: 1 as const,
    updated_at: "2026-04-21T10:00:00Z",
    phase: "implementation",
    blocked_reasons: [],
    plan: {
      title: "Implement governed workflow",
      summary: "Persist and enforce the workflow",
      tasks: ["Create state file"],
      status: "approved",
      updated_at: "2026-04-21T09:00:00Z",
      reviewed_at: "2026-04-21T09:05:00Z",
      review_notes: null,
    },
    last_review: {
      status: "not_run",
      scope: null,
      reviewed_at: null,
      artifact_path: null,
      summary: null,
      failed_policies: [],
    },
    approval: {
      status: "blocked",
      approved_at: null,
      notes: null,
    },
    notes: [],
    todos: [],
    history: [
      {
        at: "2026-04-21T10:01:00Z",
        event: "plan_reviewed",
        details: {
          approved: true,
          reviewer: "policy-bot",
        },
      },
    ],
  },
};

describe("workflowPushSchema", () => {
  it("accepts valid workflow payloads", () => {
    const result = workflowPushSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("preserves workflow history details metadata", () => {
    const result = workflowPushSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.workflow.history[0]?.details).toEqual({
      approved: true,
      reviewer: "policy-bot",
    });
  });

  it("rejects invalid workflow phase", () => {
    const result = workflowPushSchema.safeParse({
      ...validPayload,
      workflow: {
        ...validPayload.workflow,
        phase: "done",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid session id", () => {
    const result = workflowPushSchema.safeParse({
      ...validPayload,
      session_id: "bad id",
    });
    expect(result.success).toBe(false);
  });
});
