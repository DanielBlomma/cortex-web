import { db } from "@/db";
import { frameworkBundle } from "@/db/schema";
import { sql } from "drizzle-orm";
import type { FrameworkId } from "./types";

/**
 * Idempotent server-side seed for the six default framework bundles.
 *
 * Mirrors `cortex-web/scripts/seed-framework-bundles.mjs` but lives
 * inside the Next.js runtime so we don't depend on an out-of-band ops
 * step to make `/api/v1/govern/config` work for a fresh deploy. The
 * govern/config and govern/snapshot routes call this when they find
 * zero matching bundles, so the system self-heals on first use.
 *
 * Each row is upserted with ON CONFLICT (framework_id, version)
 * DO NOTHING. A pre-existing custom bundle authored by an admin is
 * never overwritten by this default seed.
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

const claudeHookShell = (name: string) => ({
  hooks: [{ type: "command", command: `cortex hook ${name}` }],
});

const FRAMEWORK_IDS: FrameworkId[] = [
  "iso27001",
  "iso42001",
  "soc2",
  "gdpr",
  "ai_act",
  "nis2",
];

const SEED_VERSION = "0.1.0-seed";

function buildBundlePayload(frameworkId: FrameworkId) {
  return {
    framework_id: frameworkId,
    version: SEED_VERSION,
    managed_settings: {
      claude: {
        allowManagedHooksOnly: true,
        disableBypassPermissionsMode: "disable",
        hooks: {
          PreToolUse: [claudeHookShell("pre-tool-use")],
          UserPromptSubmit: [claudeHookShell("user-prompt-submit")],
          SessionStart: [claudeHookShell("session-start")],
          SessionEnd: [claudeHookShell("session-end")],
          Stop: [claudeHookShell("stop")],
          PreCompact: [claudeHookShell("pre-compact")],
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
    },
    deny_rules: SHARED_DENY_RULES_BASELINE.map((pattern) => ({
      pattern,
      source_framework: frameworkId,
    })),
    tamper_config: {
      heartbeat_interval_seconds: 60,
      missing_threshold_seconds: 300,
    },
  };
}

let inflight: Promise<void> | null = null;
let seeded = false;

export async function ensureDefaultFrameworkBundles(): Promise<void> {
  if (seeded) return;
  if (inflight) {
    await inflight;
    return;
  }
  inflight = (async () => {
    try {
      // Cheap existence check — if any seed-version row exists, assume seed
      // has already run on this DB and skip.
      const existing = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(frameworkBundle)
        .where(sql`${frameworkBundle.version} = ${SEED_VERSION}`);
      if ((existing[0]?.count ?? 0) >= FRAMEWORK_IDS.length) {
        seeded = true;
        return;
      }

      const rows = FRAMEWORK_IDS.map((id) => {
        const b = buildBundlePayload(id);
        return {
          frameworkId: b.framework_id,
          version: b.version,
          managedSettings: b.managed_settings,
          denyRules: b.deny_rules,
          tamperConfig: b.tamper_config,
        };
      });

      await db
        .insert(frameworkBundle)
        .values(rows)
        .onConflictDoNothing({
          target: [frameworkBundle.frameworkId, frameworkBundle.version],
        });

      seeded = true;
    } catch (err) {
      // Don't poison the cache on failure — let the next caller retry.
      console.error("[govern] ensureDefaultFrameworkBundles failed:", err);
    } finally {
      inflight = null;
    }
  })();
  await inflight;
}
