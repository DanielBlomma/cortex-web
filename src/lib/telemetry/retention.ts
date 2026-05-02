export const TELEMETRY_RETENTION_POLICY = {
  days: 30,
  payload: "counts_and_metadata_only",
  excludes: [
    "source_code",
    "raw_prompts",
    "raw_queries",
    "embeddings",
    "graph_data",
    "full_file_contents",
  ],
} as const;

export const TELEMETRY_GOVERNANCE_GUIDANCE = {
  includedData: [
    "Aggregate counts for tool calls, searches, lookups, reloads, sessions, and returned results",
    "Pseudonymous instance and session identifiers used for operational traceability",
    "Client version, ingestion timestamps, and bounded tool-level usage buckets",
  ],
  tokenMethodology: {
    preferredSource: "estimated_tokens_total reported by the client",
    fallback:
      "When total tokens are omitted, Cortex estimates total prompt volume as estimated_tokens_saved + total_results_returned * 400.",
    caveat:
      "Estimated totals are directional efficiency signals and should not be treated as billing-grade accounting.",
  },
  complianceSupport: {
    frameworks: ["GDPR", "EU AI Act", "NIS2", "ISO 27001", "ISO 42001"],
    posture:
      "Telemetry supports these frameworks through data minimization, traceability, access control, and monitoring controls. It does not by itself guarantee full compliance.",
    sharedResponsibility: [
      "Define lawful basis, retention approvals, and internal notices for telemetry processing",
      "Review who can access telemetry dashboards and exported reports",
      "Validate control mappings against your own risk register, DPIA, and management system",
    ],
  },
} as const;
