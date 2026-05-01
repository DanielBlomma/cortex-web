import { createHash } from "crypto";
import {
  type FrameworkBundlePayload,
  type FrameworkId,
  type GovernCli,
  type ManagedSettingsForCli,
  type MergedGovernConfig,
} from "./types";

type BundleInput = {
  framework_id: FrameworkId;
  version: string;
  payload: FrameworkBundlePayload;
};

function uniquePush<T>(arr: T[], value: T, eq: (a: T, b: T) => boolean): void {
  if (!arr.some((existing) => eq(existing, value))) arr.push(value);
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function mergeManagedSettingsForCli(
  bundles: BundleInput[],
  cli: GovernCli,
): ManagedSettingsForCli {
  const merged: ManagedSettingsForCli = {};
  const denyAccum: string[] = [];
  const allowAccum: string[] = [];
  const askAccum: string[] = [];
  let allowManagedHooksOnly = false;
  let disableBypass = false;

  for (const b of bundles) {
    const cliSettings = b.payload.managed_settings?.[cli];
    if (!cliSettings) continue;

    if (cliSettings.permissions?.deny) {
      for (const p of cliSettings.permissions.deny) uniquePush(denyAccum, p, (a, b) => a === b);
    }
    if (cliSettings.permissions?.allow) {
      for (const p of cliSettings.permissions.allow) uniquePush(allowAccum, p, (a, b) => a === b);
    }
    if (cliSettings.permissions?.ask) {
      for (const p of cliSettings.permissions.ask) uniquePush(askAccum, p, (a, b) => a === b);
    }
    if (cliSettings.allowManagedHooksOnly === true) allowManagedHooksOnly = true;
    if (cliSettings.disableBypassPermissionsMode === "disable") disableBypass = true;

    if (cliSettings.hooks) {
      merged.hooks = merged.hooks ?? {};
      for (const [event, entries] of Object.entries(cliSettings.hooks)) {
        const existing = (merged.hooks as Record<string, unknown[]>)[event] ?? [];
        const incoming = Array.isArray(entries) ? entries : [entries];
        const deduped = [...existing];
        for (const entry of incoming) {
          uniquePush(deduped, entry, (a, b) => stableJson(a) === stableJson(b));
        }
        (merged.hooks as Record<string, unknown[]>)[event] = deduped;
      }
    }
    if (cliSettings.sandbox) {
      merged.sandbox = { ...(merged.sandbox ?? {}), ...cliSettings.sandbox };
    }
  }

  if (denyAccum.length || allowAccum.length || askAccum.length) {
    merged.permissions = {};
    if (denyAccum.length) merged.permissions.deny = denyAccum;
    if (allowAccum.length) merged.permissions.allow = allowAccum;
    if (askAccum.length) merged.permissions.ask = askAccum;
  }
  if (allowManagedHooksOnly) merged.allowManagedHooksOnly = true;
  if (disableBypass) merged.disableBypassPermissionsMode = "disable";

  return merged;
}

function mergeDenyRules(bundles: BundleInput[], cli: GovernCli) {
  const byPattern = new Map<string, Set<FrameworkId>>();
  for (const b of bundles) {
    for (const rule of b.payload.deny_rules ?? []) {
      if (rule.cli && rule.cli !== cli) continue;
      const set = byPattern.get(rule.pattern) ?? new Set<FrameworkId>();
      set.add(rule.source_framework);
      byPattern.set(rule.pattern, set);
    }
  }
  return Array.from(byPattern.entries()).map(([pattern, frameworks]) => ({
    pattern,
    source_frameworks: Array.from(frameworks).sort() as FrameworkId[],
  }));
}

function mergeTamperConfig(bundles: BundleInput[]) {
  let heartbeat = Number.POSITIVE_INFINITY;
  let missing = Number.POSITIVE_INFINITY;
  for (const b of bundles) {
    const t = b.payload.tamper_config;
    if (!t) continue;
    if (t.heartbeat_interval_seconds < heartbeat) heartbeat = t.heartbeat_interval_seconds;
    if (t.missing_threshold_seconds < missing) missing = t.missing_threshold_seconds;
  }
  if (!isFinite(heartbeat)) heartbeat = 60;
  if (!isFinite(missing)) missing = 300;
  return { heartbeat_interval_seconds: heartbeat, missing_threshold_seconds: missing };
}

export function mergeBundles(
  bundles: BundleInput[],
  cli: GovernCli,
): { config: MergedGovernConfig; version: string } {
  const config: MergedGovernConfig = {
    cli,
    managed_settings: mergeManagedSettingsForCli(bundles, cli),
    deny_rules: mergeDenyRules(bundles, cli),
    tamper_config: mergeTamperConfig(bundles),
    frameworks: bundles.map((b) => ({ id: b.framework_id, version: b.version })),
  };
  const version = createHash("sha256")
    .update(JSON.stringify(config))
    .digest("hex");
  return { config, version };
}
