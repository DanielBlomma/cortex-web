import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL);

/**
 * Seed initial framework bundles. Per PLAN.govern-mode.md §3, the *content*
 * of each framework's controls is out of scope — we ship the *structure*
 * (managed_settings + deny_rules + tamper_config shape) so the API contract
 * is exercisable end-to-end. Real bundles are authored later by an external
 * compliance reviewer.
 *
 * Re-running is safe: each bundle is upserted on (framework_id, version).
 */

const SHARED_DENY_RULES_BASELINE = [
  "Bash(cortex hooks *)",
  "Bash(cortex enterprise *)",
  "Bash(cortex govern *)",
  "Edit(/Library/Application Support/ClaudeCode/**)",
  "Write(/Library/Application Support/ClaudeCode/**)",
  "Edit(/etc/claude-code/**)",
  "Write(/etc/claude-code/**)",
  "Edit(~/.claude/settings.json)",
  "Edit(~/.claude/settings.local.json)",
  "Write(~/.claude/settings.json)",
  "Write(~/.claude/settings.local.json)",
];

const CLAUDE_HOOK_SHELL = (name) => ({
  hooks: [{ type: "command", command: `cortex hook ${name}` }],
});

function buildBundle(frameworkId) {
  const managedSettings = {
    claude: {
      allowManagedHooksOnly: true,
      disableBypassPermissionsMode: "disable",
      hooks: {
        PreToolUse: [CLAUDE_HOOK_SHELL("pre-tool-use")],
        UserPromptSubmit: [CLAUDE_HOOK_SHELL("user-prompt-submit")],
        SessionStart: [CLAUDE_HOOK_SHELL("session-start")],
        SessionEnd: [CLAUDE_HOOK_SHELL("session-end")],
        Stop: [CLAUDE_HOOK_SHELL("stop")],
        PreCompact: [CLAUDE_HOOK_SHELL("pre-compact")],
      },
      permissions: { deny: SHARED_DENY_RULES_BASELINE },
    },
    codex: {
      hooks: {
        PreToolUse: [{ command: "cortex hook pre-tool-use" }],
        UserPromptSubmit: [{ command: "cortex hook user-prompt-submit" }],
        SessionStart: [{ command: "cortex hook session-start" }],
        SessionEnd: [{ command: "cortex hook session-end" }],
        Stop: [{ command: "cortex hook stop" }],
      },
      permissions: {
        deny: SHARED_DENY_RULES_BASELINE.concat([
          "Edit(~/.codex/config.toml)",
          "Edit(~/.codex/hooks.json)",
          "Edit(/etc/codex/requirements.toml)",
        ]),
      },
      sandbox: { mode: "workspace-write", network_access: false },
    },
    copilot: {
      sandbox: {
        type: "wrap",
        wrapper: "cortex run copilot",
        deny_write: ["~/.copilot/**", "~/.copilot.local/**", "/etc/copilot*"],
      },
    },
  };

  const denyRules = SHARED_DENY_RULES_BASELINE.map((pattern) => ({
    pattern,
    source_framework: frameworkId,
  }));

  return {
    framework_id: frameworkId,
    version: "0.1.0-seed",
    managed_settings: managedSettings,
    deny_rules: denyRules,
    tamper_config: {
      heartbeat_interval_seconds: 60,
      missing_threshold_seconds: 300,
    },
  };
}

const FRAMEWORKS = ["iso27001", "iso42001", "soc2", "gdpr", "ai_act", "nis2"];

let inserted = 0;
let skipped = 0;
for (const frameworkId of FRAMEWORKS) {
  const b = buildBundle(frameworkId);
  const result = await sql`
    INSERT INTO framework_bundle (framework_id, version, managed_settings, deny_rules, tamper_config)
    VALUES (
      ${b.framework_id},
      ${b.version},
      ${sql.json(b.managed_settings)},
      ${sql.json(b.deny_rules)},
      ${sql.json(b.tamper_config)}
    )
    ON CONFLICT (framework_id, version) DO NOTHING
    RETURNING id
  `;
  if (result.length > 0) {
    inserted += 1;
    console.log(`✓ inserted ${frameworkId}@${b.version}`);
  } else {
    skipped += 1;
    console.log(`- ${frameworkId}@${b.version} already exists, skipping`);
  }
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}.`);
await sql.end();
