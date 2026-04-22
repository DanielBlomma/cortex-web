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
