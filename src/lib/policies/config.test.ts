import { describe, expect, it } from "vitest";
import {
  harmonizePolicyConfigSeverity,
  resolvePolicyUpdateConfig,
} from "./config";

describe("harmonizePolicyConfigSeverity", () => {
  it("removes embedded severity for block policies", () => {
    expect(
      harmonizePolicyConfigSeverity("block", {
        pattern: "TODO",
        severity: "warning",
      })
    ).toEqual({ pattern: "TODO" });
  });
});

describe("resolvePolicyUpdateConfig", () => {
  const existing = {
    severity: "warning" as const,
    config: { pattern: "TODO", severity: "warning" },
  };

  it("preserves existing config on partial updates that do not touch config", () => {
    expect(resolvePolicyUpdateConfig(existing, {})).toBeUndefined();
    expect(resolvePolicyUpdateConfig(existing, { severity: undefined })).toEqual(
      existing.config
    );
  });

  it("reharmonizes existing config when severity changes", () => {
    expect(resolvePolicyUpdateConfig(existing, { severity: "error" })).toEqual({
      pattern: "TODO",
      severity: "error",
    });
  });

  it("accepts an explicit config replacement", () => {
    expect(
      resolvePolicyUpdateConfig(existing, {
        config: { pattern: "FIXME" },
      })
    ).toEqual({
      pattern: "FIXME",
      severity: "warning",
    });
  });

  it("accepts explicit config clearing", () => {
    expect(resolvePolicyUpdateConfig(existing, { config: null })).toBeNull();
  });
});
