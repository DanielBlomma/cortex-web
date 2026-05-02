export type DashboardHelpContent = {
  title: string;
  summary: string;
  sections: {
    title: string;
    items: string[];
  }[];
};

export const dashboardHelp = {
  overviewPage: {
    title: "Overview guide",
    summary:
      "This page is the executive snapshot of your Cortex control plane across rollout readiness, telemetry, policy health, violations, access, and active rules.",
    sections: [
      {
        title: "What it is",
        items: [
          "A cross-page summary built from the same data shown in rollout, analytics, violations, access, and policy management.",
          "Operational signals here act like rollout gates: they show whether the system has enough governance evidence to expand safely.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It helps operators spot blockers early instead of discovering them after rollout has widened.",
          "It gives one place to decide whether the organization is healthy, noisy, or missing evidence.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Start with Operational Health and Rollout Checklist, then drill into violations, access, and active policies.",
          "Use the linked cards to move from summary to root-cause pages when something turns warning or critical.",
        ],
      },
    ],
  },
  overviewOperationalHealth: {
    title: "Operational Health",
    summary:
      "Operational Health combines the core rollout signals that determine whether Cortex is actually governable in production.",
    sections: [
      {
        title: "What it is",
        items: [
          "Each signal represents a readiness area such as policy health, sync status, telemetry coverage, or review coverage.",
          "The metric, summary, and detail text explain the current state and what the system is missing.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "A rollout is only trustworthy if policies are active, data is arriving, reviews are happening, and sync is healthy.",
          "This card makes those dependencies visible instead of hiding them behind a single green status.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Treat warning and critical signals as rollout blockers until the linked page shows enough supporting evidence.",
          "Use the updated timestamp to judge whether the signal reflects current activity or stale reporting.",
        ],
      },
    ],
  },
  overviewRolloutChecklist: {
    title: "Rollout Checklist",
    summary:
      "The rollout checklist is the operator-facing gate list for expanding Cortex from pilot usage to broader governed adoption.",
    sections: [
      {
        title: "What it is",
        items: [
          "A concrete set of launch checks derived from the current package, key access, policy state, telemetry, and workflow evidence.",
          "Each item maps to a page where the underlying evidence can be verified.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It turns vague rollout readiness into explicit go or no-go criteria.",
          "It prevents teams from scaling usage before the control plane can enforce and audit it.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Complete items should stay stable over time, not just pass once.",
          "Attention or pending items should be treated as the next operational work queue.",
        ],
      },
    ],
  },
  overviewSearchActivity: {
    title: "Search Activity",
    summary:
      "This chart shows recent Cortex search demand, which is the fastest way to see whether the product is being actively used.",
    sections: [
      {
        title: "What it is",
        items: [
          "A short trend view of daily search volume from telemetry.",
          "It summarizes activity rather than policy quality or compliance quality.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "No or collapsing search volume can mean adoption problems, broken reporting, or inactive instances.",
          "Sustained usage provides the baseline needed for the rest of the analytics to be meaningful.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use it as an activity pulse, then open Analytics if you need breakdowns for token savings and tool usage.",
        ],
      },
    ],
  },
  overviewViolations: {
    title: "Violations summary",
    summary:
      "This section compresses the current policy breach picture into severity counts and a short list of the latest incidents.",
    sections: [
      {
        title: "What it is",
        items: [
          "A severity mix plus recent violation events reported by connected cortex-enterprise instances.",
          "It is meant for triage, not full forensics.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Violations are direct evidence that rules are being triggered in real workflows.",
          "A rising error count usually means enforcement gaps, bad policy fit, or risky user behavior.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use the severity mix to judge urgency, then open Policy Violations to find repeated rules and recent examples.",
        ],
      },
    ],
  },
  overviewAccess: {
    title: "Access",
    summary:
      "Access summarizes the live API keys that allow clients and services to talk to the Cortex control plane.",
    sections: [
      {
        title: "What it is",
        items: [
          "A short inventory of active keys, prefixes, and recent usage.",
          "It is an access posture signal, not a permission editor by itself.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Unused or poorly understood keys are a governance risk during rollout.",
          "Knowing which keys are active helps you verify adoption and trim unnecessary access.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Open the access page to revoke stale keys, inspect scopes, or provision new ones for controlled rollout.",
        ],
      },
    ],
  },
  overviewPolicies: {
    title: "Policies",
    summary:
      "This section shows the rules currently configured in the control plane and highlights which ones are actively enforced or recently triggered.",
    sections: [
      {
        title: "What it is",
        items: [
          "A compact list of selected rules with status, severity, enforcement mode, and recent trigger state.",
          "It reflects what Cortex will sync and evaluate, not a historical archive of all rule changes.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Rollout health depends on whether the right policies are live and whether they are actually firing in practice.",
          "This helps you distinguish between a configured policy set and a meaningful enforced policy set.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use this as a quick inventory, then open Policies / Rules to edit definitions, enforcement mode, and custom logic.",
        ],
      },
    ],
  },
  overviewTokenSavings: {
    title: "Token Savings",
    summary:
      "Token Savings estimates how much prompt volume Cortex avoided by retrieving smaller, more relevant context instead of dumping everything into the model.",
    sections: [
      {
        title: "What it is",
        items: [
          "A comparison between raw total tokens and the smaller context actually used after Cortex search and filtering.",
          "The percent and bar visualize efficiency rather than absolute business value.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Lower token usage usually means lower cost, faster responses, and less noisy context for the model.",
          "It also shows whether Cortex is delivering real retrieval value instead of acting like a pass-through layer.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use Analytics for daily token patterns when you need to compare efficiency across time.",
        ],
      },
    ],
  },
  analyticsPage: {
    title: "Analytics guide",
    summary:
      "Analytics is the usage and efficiency view for Cortex telemetry across all connected instances.",
    sections: [
      {
        title: "What it is",
        items: [
          "A telemetry dashboard covering searches, lookups, reloads, result volume, instances, and token savings.",
          "It focuses on how Cortex is used and how efficiently it trims context.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It validates adoption, load, and retrieval quality at the system level.",
          "It helps separate policy problems from simple inactivity or missing telemetry.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Check summary cards for usage totals, then review token savings and the daily breakdown for trend analysis.",
        ],
      },
    ],
  },
  analyticsTokenSavings: {
    title: "Token Savings",
    summary:
      "This card explains the efficiency side of Cortex by comparing saved tokens against total prompt volume.",
    sections: [
      {
        title: "What it is",
        items: [
          "A savings gauge plus daily saved-versus-used bars.",
          "Saved means tokens Cortex avoided sending because it returned smaller, relevant context.",
          "If the client omits total token volume, Cortex estimates it from returned results rather than pretending the total is exact.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It shows whether retrieval is actually shrinking prompt size instead of adding overhead.",
          "Sharp changes can signal product usage shifts, telemetry gaps, or search-quality changes.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Compare the overall percentage with the daily bars to see whether efficiency is stable or drifting.",
        ],
      },
    ],
  },
  analyticsDailyBreakdown: {
    title: "Daily Breakdown",
    summary:
      "The daily table is the operational detail behind the headline metrics on the Analytics page.",
    sections: [
      {
        title: "What it is",
        items: [
          "A per-day breakdown of searches, lookups, reloads, results, pushes, and token counts.",
          "It is designed for pattern detection rather than long-range reporting.",
          "Token percentages may be based on reported totals or on Cortex's fallback estimate, depending on what each client version sends.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Daily data lets you match behavior changes to releases, incidents, or adoption campaigns.",
          "It also helps separate one-day spikes from real trends.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use it when totals look odd and you need to know whether the issue is recent, intermittent, or sustained.",
        ],
      },
    ],
  },
  analyticsBoundary: {
    title: "Telemetry Boundary",
    summary:
      "This section explains exactly what Cortex telemetry contains, what is excluded, and how it supports compliance work.",
    sections: [
      {
        title: "What it is",
        items: [
          "A plain-language summary of the telemetry boundary: counts and metadata in, raw prompts and source code out.",
          "It also describes whether token totals are reported directly by clients or estimated by Cortex.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Operators need to understand whether analytics data is suitable for product monitoring, audit evidence, or financial accounting.",
          "Compliance teams also need to see that telemetry uses data minimization and shared-responsibility boundaries.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use this card to sanity-check retention, exclusions, and control-support claims before sharing telemetry outside the engineering team.",
        ],
      },
    ],
  },
  violationsPage: {
    title: "Policy Violations guide",
    summary:
      "This page is the incident view for rule breaches detected by connected cortex-enterprise instances.",
    sections: [
      {
        title: "What it is",
        items: [
          "A dashboard of severity counts, trend data, repeated rule breaches, and recent violation events.",
          "It shows what the policy engine is catching in real workflows.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Violations are direct evidence of risk, friction, or bad policy fit during rollout.",
          "Repeated breaches often identify the rules or teams that need policy tuning or process change.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Check the trend first, then the top rules, then inspect recent events for concrete examples and repos.",
        ],
      },
    ],
  },
  violationsDaily: {
    title: "Daily Violations",
    summary:
      "This chart shows whether policy breaches are stable, improving, or accelerating over recent days.",
    sections: [
      {
        title: "What it is",
        items: [
          "A stacked daily trend of errors, warnings, and info-level violations.",
          "Bar height shows total volume while color mix shows severity distribution.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It reveals whether the system is getting safer or simply quieter.",
          "A flat total with a worsening severity mix is still a governance problem.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Look for spikes after rule changes, new teams, or new rollout stages.",
        ],
      },
    ],
  },
  violationsByRule: {
    title: "Violations by Rule",
    summary:
      "This table identifies which rules generate the most repeated friction or risk.",
    sections: [
      {
        title: "What it is",
        items: [
          "A ranked rule breakdown with counts, error volume, warning volume, and last seen time.",
          "It turns raw incidents into policy-specific hotspots.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "High-volume rules often indicate important controls, noisy rules, or poor rollout guidance.",
          "It gives you the fastest path to deciding whether to educate, tune, or enforce harder.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Start with the rules that have the highest count and highest error share.",
        ],
      },
    ],
  },
  violationsRecent: {
    title: "Recent Violations",
    summary:
      "Recent Violations gives the latest concrete examples behind the aggregated metrics.",
    sections: [
      {
        title: "What it is",
        items: [
          "A chronological sample of recent rule breaches including message, repo, file path, and timestamp.",
          "It is meant for triage and pattern recognition.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Numbers alone do not tell you whether a rule is catching something serious or merely annoying.",
          "Recent examples provide the context needed for tuning or escalation.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Compare several recent entries before changing a policy so you do not optimize for a single outlier.",
        ],
      },
    ],
  },
  reviewsPage: {
    title: "Policy Reviews guide",
    summary:
      "Policy Reviews tracks validator outcomes from `/review` runs and shows how often changes pass governed checks before rollout.",
    sections: [
      {
        title: "What it is",
        items: [
          "A review-quality dashboard with compliance score, daily trends, per-policy outcomes, and recent review messages.",
          "It reflects pre-rollout evaluation quality rather than post-rollout incidents.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Strong review coverage reduces the chance of unsafe changes reaching broader usage.",
          "Low pass rates or missing review volume weaken confidence in rollout signals.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use the compliance score as a headline, then inspect trends and the most problematic policies.",
        ],
      },
    ],
  },
  reviewsDaily: {
    title: "Daily Reviews",
    summary:
      "This chart shows whether review activity is happening consistently and whether reviews are mostly passing or failing.",
    sections: [
      {
        title: "What it is",
        items: [
          "A daily split of passed and failed review results.",
          "It combines volume and quality into one trend view.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Low review volume can mean missing workflow evidence.",
          "A deteriorating pass rate can mean policy changes, code quality issues, or poor guidance for users.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Look for drops in volume and rises in failures around deployments or policy updates.",
        ],
      },
    ],
  },
  reviewsByPolicy: {
    title: "Reviews by Policy",
    summary:
      "This section shows which specific policies are passing cleanly and which ones are generating repeated failures or errors.",
    sections: [
      {
        title: "What it is",
        items: [
          "A policy-level breakdown of review outcomes across total runs, passes, fails, and errors.",
          "It reveals which controls are the main source of review friction.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Policy-specific failure clusters help you prioritize rule tuning and rollout guidance.",
          "It prevents a weak policy from hiding inside an acceptable overall compliance score.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Investigate policies with frequent failures, low pass rates, or recent spikes.",
        ],
      },
    ],
  },
  reviewsRecent: {
    title: "Recent Reviews",
    summary:
      "Recent Reviews shows the latest validator decisions and their messages so operators can inspect real outcomes quickly.",
    sections: [
      {
        title: "What it is",
        items: [
          "A time-ordered list of recent review records including pass state, severity, repo, and explanatory detail.",
          "It is the fastest bridge from aggregate metrics to human-readable evidence.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It helps you distinguish noisy failure counts from meaningful governance problems.",
          "It also shows whether review output is actionable enough for teams to respond to.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Read several entries together before changing policies so you understand the recurring failure pattern.",
        ],
      },
    ],
  },
  policiesPage: {
    title: "Policies / Rules guide",
    summary:
      "This page is the control surface for the rules Cortex syncs, enforces, and reports across the organization.",
    sections: [
      {
        title: "What it is",
        items: [
          "A combined rule catalog and policy editor for predefined and custom controls.",
          "It shows what is selected, what is active, and how each rule is configured.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Policy quality directly determines whether rollout gates, reviews, and violation reporting are meaningful.",
          "A well-governed rollout depends on clear, enforceable, and maintainable rules.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Keep the selected set intentional, prefer enforceable rules for real controls, and review trigger history before tightening policies.",
        ],
      },
    ],
  },
  policiesSelected: {
    title: "Selected",
    summary:
      "Selected is the current active inventory of policies configured in this control plane.",
    sections: [
      {
        title: "What it is",
        items: [
          "A compact list of all configured policies, with active count and visible rule IDs.",
          "It answers what the organization has chosen to govern right now.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "A large rules catalog is less useful than a deliberate, understandable selected set.",
          "This section helps confirm that the configured rule set matches current rollout goals.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use it as a quick inventory check before editing individual predefined or custom policies.",
        ],
      },
    ],
  },
  policiesPredefined: {
    title: "Predefined Rules",
    summary:
      "Predefined Rules are built-in controls that can be selected, enforced, or tuned without inventing custom logic first.",
    sections: [
      {
        title: "What it is",
        items: [
          "A curated catalog of common security, quality, and compliance rules.",
          "Each card shows category, priority, scope, severity, enforcement mode, and trigger state when selected.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Predefined rules give you a faster path to baseline governance and more consistent rollout decisions.",
          "They are usually the first place to start before introducing custom policy logic.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Select the rules that match your operating model, then tighten status or enforcement as the rollout matures.",
        ],
      },
    ],
  },
  policiesCustom: {
    title: "Custom Policies",
    summary:
      "Custom Policies let you add organization-specific controls that are not covered by the predefined rule catalog.",
    sections: [
      {
        title: "What it is",
        items: [
          "A set of bespoke policies with their own evaluator type, config, priority, and performance history.",
          "These are the rules that encode your local governance requirements.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Custom policy is where the control plane becomes specific to your business, repos, and risk model.",
          "It is also where overly broad logic can create the most friction if not reviewed carefully.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use recent failures, warnings, and violations as evidence before making a custom rule stricter or broader.",
        ],
      },
    ],
  },
  auditPage: {
    title: "Audit Trail guide",
    summary:
      "Audit Trail is the evidence page for who did what, from where, and with what level of governance relevance.",
    sections: [
      {
        title: "What it is",
        items: [
          "A searchable record of local enterprise activity and web control-plane actions.",
          "Events are split by source, type, evidence level, and detailed metadata.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Audit evidence is what lets you reconstruct actions, support reviews, and defend compliance claims.",
          "Without it, rollout status and compliance reporting become hard to trust.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use filters to narrow the evidence set, then inspect recent entries for concrete supporting detail.",
        ],
      },
    ],
  },
  auditEventTypes: {
    title: "Event Types",
    summary:
      "Event Types shows the categories of activity currently present in the filtered audit result set.",
    sections: [
      {
        title: "What it is",
        items: [
          "A grouped count of matching event types under the active search and filter state.",
          "It gives a high-level map of what kinds of evidence are currently in scope.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It helps you understand whether the audit trail is dominated by access changes, sync events, tooling activity, or something else.",
          "It also shows whether your filters are too broad or too narrow.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use it to pivot the investigation before reading individual events.",
        ],
      },
    ],
  },
  auditRecentEvidence: {
    title: "Recent Evidence",
    summary:
      "Recent Evidence is the readable event stream behind the audit counts and filter controls.",
    sections: [
      {
        title: "What it is",
        items: [
          "A recent list of audit entries including evidence level, source, event type, action, repo, session, and optional tool metadata.",
          "It is designed for investigation and validation.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "This is the concrete evidence you can inspect when totals or reports raise questions.",
          "It shows whether the audit system is recording the detail needed for governance and compliance.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Start from the newest entries and follow the session, repo, or tool metadata that matches your question.",
        ],
      },
    ],
  },
  compliancePage: {
    title: "Compliance guide",
    summary:
      "The Compliance page generates a point-in-time report that maps Cortex evidence to governance and compliance control areas.",
    sections: [
      {
        title: "What it is",
        items: [
          "A report generator that assembles policy, access, violations, reviews, workflow evidence, audit trail, and usage into one exportable package.",
          "It is evidence-oriented and period-bounded rather than a live operational dashboard.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It gives auditors, security teams, and leadership a structured evidence pack instead of scattered screenshots.",
          "It also shows which claims are covered by Cortex and which still remain customer responsibilities.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Pick the reporting period first, then review the evidence sections that map to your control objectives.",
        ],
      },
    ],
  },
  compliancePolicyGovernance: {
    title: "Policy Governance",
    summary:
      "Policy Governance documents the policy layer that defines how Cortex is expected to govern AI use.",
    sections: [
      {
        title: "What it is",
        items: [
          "An inventory of active, enforced, and disabled policies plus the underlying definitions.",
          "It is the compliance view of rule governance, not just the editing view.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Auditors need to see that controls exist, are defined, and have an enforcement posture.",
          "This section turns rule configuration into reportable governance evidence.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Review active and enforced coverage first, then inspect any disabled rules that weaken your story.",
        ],
      },
    ],
  },
  complianceControlCoverage: {
    title: "Control Coverage",
    summary:
      "Control Coverage maps Cortex capabilities and evidence signals to the compliance controls included in the report.",
    sections: [
      {
        title: "What it is",
        items: [
          "A summary of which controls are covered, only partially covered, or still manual in the selected reporting period.",
          "Each row links a control objective to Cortex capability, rationale, framework mappings, and evidence signals.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It stops the report from becoming a pile of raw data by connecting evidence to actual control claims.",
          "This is the section that makes shared-responsibility boundaries and evidence strength visible to reviewers.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Start with partial and manual controls first, because they are the places where additional process or tooling is still needed.",
        ],
      },
    ],
  },
  complianceAccessControl: {
    title: "Access Control",
    summary:
      "Access Control captures the credentials and scope boundaries used to reach the Cortex control plane.",
    sections: [
      {
        title: "What it is",
        items: [
          "A report section for active keys, revoked keys, scopes, and recent usage.",
          "It provides access-governance evidence for the selected period.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Access control is a core audit area because it governs who can push telemetry, sync policy, or manage the system.",
          "This section helps prove that credentials are monitored and revocation exists.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Check whether the active key set is appropriately small and whether revoked keys are visible in the period.",
        ],
      },
    ],
  },
  complianceViolations: {
    title: "Compliance Violations",
    summary:
      "This section reports the operational evidence that policy controls were triggered during the reporting period.",
    sections: [
      {
        title: "What it is",
        items: [
          "A period-bounded summary of total violations and their rule-level breakdown.",
          "It shows both control activity and control friction.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Compliance reporting is stronger when it includes proof that controls are actively detecting issues.",
          "Repeated findings also reveal where control tuning or process remediation is needed.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use the by-rule view to explain where the bulk of policy friction or risk sits during the period.",
        ],
      },
    ],
  },
  complianceReviewEvidence: {
    title: "Review Evidence",
    summary:
      "Review Evidence documents how often governed checks were run before changes progressed through workflow.",
    sections: [
      {
        title: "What it is",
        items: [
          "A compact summary of review totals, pass rate, failures, and blocking outcomes.",
          "It represents preventive control evidence rather than incident evidence.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Strong preventive evidence improves the credibility of your overall control environment.",
          "It shows that policy enforcement is not only reactive after the fact.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Read it alongside Workflow Evidence to judge whether review activity is happening at the right stage.",
        ],
      },
    ],
  },
  complianceWorkflowEvidence: {
    title: "Workflow Evidence",
    summary:
      "Workflow Evidence shows how governed workflow snapshots moved through plan, review, approval, and readiness states.",
    sections: [
      {
        title: "What it is",
        items: [
          "A period view of snapshots plus recent workflow records by repo, phase, approval, and review status.",
          "It shows process evidence around how changes progressed.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "This section proves that governance is embedded in workflow, not bolted on at the end.",
          "It is especially useful when explaining rollout discipline and approval pathways.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Look for blocked or unreviewed states that weaken the compliance story for the selected period.",
        ],
      },
    ],
  },
  complianceAuditTrail: {
    title: "Compliance Audit Trail",
    summary:
      "This is the report-friendly slice of the audit log that supports traceability claims for the selected period.",
    sections: [
      {
        title: "What it is",
        items: [
          "A table of evidence events with timestamps, source, evidence level, action, resource, and description.",
          "It converts raw audit recording into exportable compliance evidence.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Traceability is a core requirement in many audits and internal reviews.",
          "This section shows that Cortex can reconstruct meaningful activity during the reporting window.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use the evidence level and source columns to explain why each event belongs in the report.",
        ],
      },
    ],
  },
  complianceSystemUsage: {
    title: "System Usage",
    summary:
      "System Usage quantifies how the platform was used during the reporting period.",
    sections: [
      {
        title: "What it is",
        items: [
          "An operational usage rollup of tool calls, searches, sessions, pushes, duration, and result counts.",
          "It is a supporting evidence section rather than a direct control section.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "It shows whether the platform is actively in use and provides scale context for the rest of the report.",
          "Evidence from an inactive system is much weaker than evidence from one seeing steady production use.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use these numbers to give auditors context for the size and frequency of governed activity.",
        ],
      },
    ],
  },
  complianceResponsibilities: {
    title: "Residual Customer Responsibilities",
    summary:
      "This section lists the governance and compliance work that Cortex does not fully own for you.",
    sections: [
      {
        title: "What it is",
        items: [
          "A plain-language list of customer-side responsibilities that remain outside Cortex automation.",
          "It makes the shared-responsibility boundary explicit.",
        ],
      },
      {
        title: "Why it matters",
        items: [
          "Clear boundaries prevent overclaiming during audits or internal reporting.",
          "It helps teams understand which controls still require local process, people, or additional tooling.",
        ],
      },
      {
        title: "How to use it",
        items: [
          "Use this section to document follow-up actions and close gaps that the product intentionally does not cover.",
        ],
      },
    ],
  },
} satisfies Record<string, DashboardHelpContent>;
