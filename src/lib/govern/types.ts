export const GOVERN_CLIS = ["claude", "codex", "copilot"] as const;
export type GovernCli = (typeof GOVERN_CLIS)[number];

export const FRAMEWORK_IDS = [
  "iso27001",
  "iso42001",
  "soc2",
  "gdpr",
  "ai_act",
  "nis2",
] as const;
export type FrameworkId = (typeof FRAMEWORK_IDS)[number];

export const DEFAULT_FRAMEWORKS: FrameworkId[] = ["iso27001", "iso42001", "soc2"];
export const EU_ADDON_FRAMEWORKS: FrameworkId[] = ["gdpr", "ai_act", "nis2"];

export type ManagedSettingsForCli = {
  hooks?: Record<string, unknown>;
  permissions?: { deny?: string[]; allow?: string[]; ask?: string[] };
  allowManagedHooksOnly?: boolean;
  disableBypassPermissionsMode?: "disable" | "allow";
  sandbox?: Record<string, unknown>;
  [key: string]: unknown;
};

export type FrameworkBundlePayload = {
  managed_settings: Partial<Record<GovernCli, ManagedSettingsForCli>>;
  deny_rules: Array<{ pattern: string; source_framework: FrameworkId; cli?: GovernCli }>;
  tamper_config: {
    heartbeat_interval_seconds: number;
    missing_threshold_seconds: number;
  };
};

export type MergedGovernConfig = {
  cli: GovernCli;
  managed_settings: ManagedSettingsForCli;
  deny_rules: Array<{ pattern: string; source_frameworks: FrameworkId[] }>;
  tamper_config: {
    heartbeat_interval_seconds: number;
    missing_threshold_seconds: number;
  };
  frameworks: Array<{ id: FrameworkId; version: string }>;
};

export function isFrameworkId(value: string): value is FrameworkId {
  return (FRAMEWORK_IDS as readonly string[]).includes(value);
}

export function isGovernCli(value: string): value is GovernCli {
  return (GOVERN_CLIS as readonly string[]).includes(value);
}
