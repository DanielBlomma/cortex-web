import { describe, it, expect } from "vitest";
import {
  governAppliedSchema,
  governHeartbeatSchema,
  ungovernedReportSchema,
  hookTamperReportSchema,
} from "./govern";

describe("governAppliedSchema", () => {
  it("accepts a minimal valid kvittens", () => {
    const result = governAppliedSchema.safeParse({
      host_id: "alice-mbp",
      cli: "claude",
      version: "abc123def456",
      source: "manual",
      success: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown cli", () => {
    const result = governAppliedSchema.safeParse({
      host_id: "h",
      cli: "gemini",
      version: "v1",
      source: "manual",
      success: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("governHeartbeatSchema", () => {
  it("accepts a heartbeat with detected AI CLIs", () => {
    const result = governHeartbeatSchema.safeParse({
      host_id: "h",
      os: "darwin",
      govern_mode: "enforced",
      active_frameworks: ["iso27001", "soc2"],
      ai_clis_detected: [
        { name: "claude", tier: "prevent" },
        { name: "copilot", tier: "wrap", last_seen: new Date().toISOString() },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown OS", () => {
    const result = governHeartbeatSchema.safeParse({
      host_id: "h",
      os: "freebsd",
      govern_mode: "advisory",
    });
    expect(result.success).toBe(false);
  });
});

describe("ungovernedReportSchema", () => {
  it("accepts a batch of events", () => {
    const result = ungovernedReportSchema.safeParse({
      events: [
        {
          detected_at: new Date().toISOString(),
          host_id: "h",
          cli: "claude",
          binary_path: "/usr/local/bin/claude",
          pid: 1234,
          parent_pid: 1,
          sys_user: "alice",
          action_taken: "logged",
        },
        {
          detected_at: new Date().toISOString(),
          host_id: "h",
          cli: "copilot",
          binary_path: "/usr/local/bin/copilot",
          action_taken: "sigterm",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty events array", () => {
    const result = ungovernedReportSchema.safeParse({ events: [] });
    expect(result.success).toBe(false);
  });

  it("caps batch size at 500", () => {
    const events = Array.from({ length: 501 }, () => ({
      detected_at: new Date().toISOString(),
      host_id: "h",
      cli: "claude",
      binary_path: "/usr/local/bin/claude",
    }));
    const result = ungovernedReportSchema.safeParse({ events });
    expect(result.success).toBe(false);
  });

  it("rejects args longer than 8192 characters", () => {
    const result = ungovernedReportSchema.safeParse({
      events: [
        {
          detected_at: new Date().toISOString(),
          host_id: "h",
          cli: "claude",
          binary_path: "/usr/local/bin/claude",
          args: "x".repeat(8193),
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts args at the 8192 limit", () => {
    const result = ungovernedReportSchema.safeParse({
      events: [
        {
          detected_at: new Date().toISOString(),
          host_id: "h",
          cli: "claude",
          binary_path: "/usr/local/bin/claude",
          args: "x".repeat(8192),
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("defaults action_taken to 'logged' when omitted", () => {
    const result = ungovernedReportSchema.safeParse({
      events: [
        {
          detected_at: new Date().toISOString(),
          host_id: "h",
          cli: "claude",
          binary_path: "/usr/local/bin/claude",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events[0].action_taken).toBe("logged");
    }
  });
});

describe("hookTamperReportSchema", () => {
  it("accepts a batch with all fields", () => {
    const now = new Date().toISOString();
    const result = hookTamperReportSchema.safeParse({
      events: [
        {
          detected_at: now,
          host_id: "h",
          cli: "claude",
          hook_name: "PreToolUse",
          session_id: "sess-1",
          last_seen: now,
          missing_seconds: 600,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts events with last_seen explicitly null", () => {
    const result = hookTamperReportSchema.safeParse({
      events: [
        {
          detected_at: new Date().toISOString(),
          host_id: "h",
          cli: "codex",
          hook_name: "Stop",
          last_seen: null,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown cli in tamper events", () => {
    const result = hookTamperReportSchema.safeParse({
      events: [
        {
          detected_at: new Date().toISOString(),
          host_id: "h",
          cli: "aider",
          hook_name: "PreToolUse",
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
