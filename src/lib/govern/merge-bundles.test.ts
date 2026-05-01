import { describe, it, expect } from "vitest";
import { mergeBundles } from "./merge-bundles";
import type { FrameworkBundlePayload, FrameworkId } from "./types";

function bundle(framework: FrameworkId, payload: FrameworkBundlePayload, version = "0.1.0") {
  return { framework_id: framework, version, payload };
}

describe("mergeBundles", () => {
  it("merges deny rules from multiple frameworks and tracks source frameworks", () => {
    const a = bundle("iso27001", {
      managed_settings: {},
      deny_rules: [{ pattern: "Bash(rm -rf *)", source_framework: "iso27001" }],
      tamper_config: { heartbeat_interval_seconds: 60, missing_threshold_seconds: 300 },
    });
    const b = bundle("soc2", {
      managed_settings: {},
      deny_rules: [
        { pattern: "Bash(rm -rf *)", source_framework: "soc2" },
        { pattern: "Edit(/etc/**)", source_framework: "soc2" },
      ],
      tamper_config: { heartbeat_interval_seconds: 30, missing_threshold_seconds: 200 },
    });

    const { config, version } = mergeBundles([a, b], "claude");

    expect(config.deny_rules).toHaveLength(2);
    const rmRule = config.deny_rules.find((r) => r.pattern === "Bash(rm -rf *)");
    expect(rmRule?.source_frameworks).toEqual(["iso27001", "soc2"]);
    expect(version).toMatch(/^[a-f0-9]{64}$/);
  });

  it("picks the most restrictive (lowest) tamper thresholds across bundles", () => {
    const a = bundle("iso27001", {
      managed_settings: {},
      deny_rules: [],
      tamper_config: { heartbeat_interval_seconds: 60, missing_threshold_seconds: 300 },
    });
    const b = bundle("soc2", {
      managed_settings: {},
      deny_rules: [],
      tamper_config: { heartbeat_interval_seconds: 30, missing_threshold_seconds: 120 },
    });

    const { config } = mergeBundles([a, b], "claude");
    expect(config.tamper_config.heartbeat_interval_seconds).toBe(30);
    expect(config.tamper_config.missing_threshold_seconds).toBe(120);
  });

  it("only includes managed_settings for the requested CLI", () => {
    const a = bundle("iso27001", {
      managed_settings: {
        claude: {
          allowManagedHooksOnly: true,
          permissions: { deny: ["Edit(~/.claude/**)"] },
        },
        codex: {
          permissions: { deny: ["Edit(~/.codex/**)"] },
        },
      },
      deny_rules: [],
      tamper_config: { heartbeat_interval_seconds: 60, missing_threshold_seconds: 300 },
    });

    const claudeMerge = mergeBundles([a], "claude");
    expect(claudeMerge.config.managed_settings.allowManagedHooksOnly).toBe(true);
    expect(claudeMerge.config.managed_settings.permissions?.deny).toEqual(["Edit(~/.claude/**)"]);

    const codexMerge = mergeBundles([a], "codex");
    expect(codexMerge.config.managed_settings.allowManagedHooksOnly).toBeUndefined();
    expect(codexMerge.config.managed_settings.permissions?.deny).toEqual(["Edit(~/.codex/**)"]);
  });

  it("respects per-rule cli scoping in deny_rules", () => {
    const a = bundle("iso27001", {
      managed_settings: {},
      deny_rules: [
        { pattern: "Edit(~/.claude/settings.json)", source_framework: "iso27001", cli: "claude" },
        { pattern: "Edit(~/.codex/config.toml)", source_framework: "iso27001", cli: "codex" },
        { pattern: "Bash(curl *)", source_framework: "iso27001" },
      ],
      tamper_config: { heartbeat_interval_seconds: 60, missing_threshold_seconds: 300 },
    });

    const claudeMerge = mergeBundles([a], "claude");
    const claudePatterns = claudeMerge.config.deny_rules.map((r) => r.pattern);
    expect(claudePatterns).toContain("Edit(~/.claude/settings.json)");
    expect(claudePatterns).toContain("Bash(curl *)");
    expect(claudePatterns).not.toContain("Edit(~/.codex/config.toml)");
  });

  it("computes deterministic version hash for the same input", () => {
    const b = bundle("iso27001", {
      managed_settings: { claude: { allowManagedHooksOnly: true } },
      deny_rules: [{ pattern: "Bash(rm)", source_framework: "iso27001" }],
      tamper_config: { heartbeat_interval_seconds: 60, missing_threshold_seconds: 300 },
    });

    const a1 = mergeBundles([b], "claude");
    const a2 = mergeBundles([b], "claude");
    expect(a1.version).toBe(a2.version);
  });

  it("different framework sets produce different versions", () => {
    const a = bundle("iso27001", {
      managed_settings: {},
      deny_rules: [{ pattern: "X", source_framework: "iso27001" }],
      tamper_config: { heartbeat_interval_seconds: 60, missing_threshold_seconds: 300 },
    });
    const b = bundle("soc2", {
      managed_settings: {},
      deny_rules: [{ pattern: "Y", source_framework: "soc2" }],
      tamper_config: { heartbeat_interval_seconds: 60, missing_threshold_seconds: 300 },
    });

    const onlyA = mergeBundles([a], "claude");
    const aAndB = mergeBundles([a, b], "claude");
    expect(onlyA.version).not.toBe(aAndB.version);
  });

  it("falls back to default tamper config when no bundles supply one", () => {
    const stripped = bundle("iso27001", {
      managed_settings: {},
      deny_rules: [],
      tamper_config: undefined as unknown as FrameworkBundlePayload["tamper_config"],
    });
    const { config } = mergeBundles([stripped], "claude");
    expect(config.tamper_config.heartbeat_interval_seconds).toBe(60);
    expect(config.tamper_config.missing_threshold_seconds).toBe(300);
  });
});
