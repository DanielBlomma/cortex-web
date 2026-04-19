// Catalog of evaluator types that cortex-enterprise can execute. Adding
// a new evaluator type means adding an entry here AND registering a
// matching generic evaluator in cortex-enterprise (packages/core/src/
// validators/evaluators/). The string IDs must match on both sides.

export type EvaluatorTypeId = "regex" | "code_comments";

export type EvaluatorField =
  | { kind: "text"; key: string; label: string; placeholder?: string; required?: boolean }
  | { kind: "textarea"; key: string; label: string; placeholder?: string; rows?: number }
  | { kind: "number"; key: string; label: string; min?: number; max?: number; defaultValue: number }
  | { kind: "select"; key: string; label: string; options: Array<{ value: string; label: string }>; defaultValue?: string }
  | { kind: "multiselect"; key: string; label: string; options: Array<{ value: string; label: string }> };

export type EvaluatorTypeDef = {
  id: EvaluatorTypeId;
  label: string;
  description: string;
  fields: EvaluatorField[];
  defaultConfig: Record<string, unknown>;
};

const SEVERITY_OPTIONS = [
  { value: "error", label: "Error (blocks review)" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

// Must match the 6 language buckets in
// cortex-enterprise/packages/core/src/validators/evaluators/code_comments.ts
const CODE_COMMENTS_LANGUAGES = [
  { value: "TypeScript/JavaScript", label: "TypeScript / JavaScript" },
  { value: "Python", label: "Python" },
  { value: "Go", label: "Go" },
  { value: "Rust", label: "Rust" },
  { value: "C#", label: "C#" },
  { value: "Java", label: "Java" },
];

export const EVALUATOR_TYPES: EvaluatorTypeDef[] = [
  {
    id: "regex",
    label: "Regex pattern",
    description:
      "Flag lines in changed files that match a regular expression. Useful for banning TODOs, magic URLs, deprecated APIs, etc.",
    fields: [
      {
        kind: "text",
        key: "pattern",
        label: "Pattern (JavaScript regex)",
        placeholder: "TODO|FIXME",
        required: true,
      },
      {
        kind: "text",
        key: "flags",
        label: "Flags (optional)",
        placeholder: "i",
      },
      {
        kind: "text",
        key: "file_pattern",
        label: "File path regex (optional)",
        placeholder: "\\.ts$",
      },
      {
        kind: "select",
        key: "severity",
        label: "Severity",
        options: SEVERITY_OPTIONS,
        defaultValue: "warning",
      },
      {
        kind: "text",
        key: "message",
        label: "Message prefix (optional)",
        placeholder: "Banned pattern",
      },
    ],
    defaultConfig: { pattern: "", severity: "warning" },
  },
  {
    id: "code_comments",
    label: "Code comments requirement",
    description:
      "Require a preceding comment (or Python docstring) on functions of a given minimum length. Covers 6 languages.",
    fields: [
      {
        kind: "number",
        key: "min_lines",
        label: "Minimum function length (lines)",
        min: 2,
        max: 1000,
        defaultValue: 15,
      },
      {
        kind: "select",
        key: "severity",
        label: "Severity",
        options: SEVERITY_OPTIONS,
        defaultValue: "warning",
      },
      {
        kind: "multiselect",
        key: "languages",
        label: "Languages (leave empty for all)",
        options: CODE_COMMENTS_LANGUAGES,
      },
    ],
    defaultConfig: { min_lines: 15, severity: "warning" },
  },
];

export function getEvaluatorType(id: string): EvaluatorTypeDef | undefined {
  return EVALUATOR_TYPES.find((t) => t.id === id);
}

// Summarize a type + config for compact display on cards. Keeps the
// first meaningful field; does not try to be exhaustive.
export function summarizeConfig(type: string, config: Record<string, unknown> | null | undefined): string {
  if (!type || !config) return "";
  if (type === "regex") {
    const p = typeof config.pattern === "string" ? config.pattern : "";
    const f = typeof config.file_pattern === "string" && config.file_pattern ? ` in ${config.file_pattern}` : "";
    return p ? `/${p}/${typeof config.flags === "string" ? config.flags : ""}${f}` : "";
  }
  if (type === "code_comments") {
    const min = typeof config.min_lines === "number" ? config.min_lines : 15;
    const langs = Array.isArray(config.languages) ? config.languages.length : 0;
    return `functions ≥${min} lines${langs > 0 ? ` (${langs} langs)` : " (all langs)"}`;
  }
  return "";
}
