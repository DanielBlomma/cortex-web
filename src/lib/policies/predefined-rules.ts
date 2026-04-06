export type PredefinedRule = {
  id: string;
  name: string;
  description: string;
  category: "security" | "quality" | "compliance";
  defaultPriority: number;
};

export const PREDEFINED_RULES: PredefinedRule[] = [
  {
    id: "no-secrets-in-code",
    name: "No Secrets in Code",
    description:
      "Prevents hardcoded secrets, API keys, and credentials from appearing in generated code.",
    category: "security",
    defaultPriority: 90,
  },
  {
    id: "require-code-review",
    name: "Require Code Review",
    description:
      "All AI-generated code changes must be reviewed before merging.",
    category: "quality",
    defaultPriority: 80,
  },
  {
    id: "max-file-size",
    name: "Maximum File Size",
    description:
      "Limits the size of files generated or modified by AI to prevent oversized outputs.",
    category: "quality",
    defaultPriority: 50,
  },
  {
    id: "no-env-in-prompts",
    name: "No Environment Variables in Prompts",
    description:
      "Prevents environment variable values from being included in AI prompts.",
    category: "security",
    defaultPriority: 85,
  },
  {
    id: "no-external-apis",
    name: "No External API Calls",
    description:
      "Restricts AI-generated code from making calls to external or unapproved APIs.",
    category: "compliance",
    defaultPriority: 70,
  },
  {
    id: "require-tests",
    name: "Require Test Coverage",
    description:
      "Ensures AI-generated code includes or is accompanied by tests.",
    category: "quality",
    defaultPriority: 60,
  },
  {
    id: "no-license-violations",
    name: "No License Violations",
    description:
      "Prevents AI from generating code that may violate open-source license terms.",
    category: "compliance",
    defaultPriority: 75,
  },
  {
    id: "safe-dependency-versions",
    name: "Safe Dependency Versions",
    description:
      "Ensures AI-suggested dependencies use pinned, known-safe versions.",
    category: "security",
    defaultPriority: 65,
  },
  {
    id: "prompt-injection-defense",
    name: "Prompt Injection Defense",
    description:
      "Detects and flags prompt injection attempts in files, comments, and context passed to AI assistants. Scans for instruction overrides, role-play attacks, delimiter escapes, and encoded payloads.",
    category: "security",
    defaultPriority: 95,
  },
];

export function isPredefinedRule(ruleId: string): boolean {
  return PREDEFINED_RULES.some((r) => r.id === ruleId);
}
