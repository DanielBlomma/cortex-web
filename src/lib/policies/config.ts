export type PolicySeverity = "info" | "warning" | "error" | "block";

type PolicyConfig = Record<string, unknown> | null | undefined;
type PolicySeverityLike = PolicySeverity | string;

type ExistingPolicyConfig = {
  severity: PolicySeverityLike;
  config: PolicyConfig;
};

type PolicyUpdateInput = {
  severity?: PolicySeverityLike;
  config?: PolicyConfig;
};

export function harmonizePolicyConfigSeverity(
  severity: PolicySeverityLike | undefined,
  config: PolicyConfig
) {
  if (!config || typeof config !== "object") return config ?? null;
  if (!severity) return config;

  const next = { ...config };
  if (severity === "block") {
    delete next.severity;
    return next;
  }

  return {
    ...next,
    severity,
  };
}

export function resolvePolicyUpdateConfig(
  existing: ExistingPolicyConfig,
  patch: PolicyUpdateInput
) {
  const hasConfig = Object.prototype.hasOwnProperty.call(patch, "config");
  const hasSeverity = Object.prototype.hasOwnProperty.call(patch, "severity");

  if (!hasConfig && !hasSeverity) return undefined;

  const nextConfig = hasConfig ? patch.config : existing.config;
  const nextSeverity = hasSeverity ? patch.severity : existing.severity;

  return harmonizePolicyConfigSeverity(nextSeverity, nextConfig);
}
