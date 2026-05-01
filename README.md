# cortex-web

Marketing site and SaaS dashboard for Cortex. Deployed at [cortx.se](https://cortx.se).

## What it is

`cortex-web` is the **control plane** for Cortex Enterprise (Connected edition). It is a pure HTTP consumer: developer machines run `cortex` + `@danielblomma/cortex-enterprise` locally, and the enterprise plugin pushes telemetry, audit events, workflow state, and violation reports here. Rules and policies flow back the other way.

`cortex-web` is **not** an MCP server. AI clients (Claude Code, Codex, Cursor) talk only to the local MCP instance — never to this app.

## Stack

- **Next.js 16** (App Router, React 19)
- **Clerk** — auth, SSO/SAML, organization scoping
- **Drizzle ORM** + **PostgreSQL** — runtime schema, telemetry, audit, policies, violations
- **Stripe** — Connected (Cloud) edition billing
- **Tailwind v4** + **shadcn/ui** + **Framer Motion** — UI
- **Vitest** + **Testing Library** — unit and contract tests
- **Vercel** — hosting (deploy via GitHub Actions on `main`)

## Architecture

- `src/app/` — App Router routes (landing, sign-in/up, dashboard, API)
- `src/app/api/v1/*` — push endpoints (`telemetry`, `audit`, `workflow`, `violations`, `policies/sync`)
- `src/components/landing/` — marketing site
- `src/components/dashboard/` — admin dashboard
- `src/lib/compliance/` — framework / control-area / regulatory-pack model
- `src/lib/policies/` — predefined rules and metadata
- `src/lib/validators/` — Zod schemas for inbound push payloads
- `src/db/` — Drizzle schema and runtime ensure helpers
- `drizzle/` — migrations

See [`docs/cortex-architecture.md`](docs/cortex-architecture.md) for the full system view across `cortex`, `cortex-enterprise`, and `cortex-web`.

## Local development

```bash
npm install
npm run dev
```

Tests:

```bash
npm test
```

Database migrations are pushed automatically on `next build` — see the `build` script in `package.json`.

### Required environment

- `DATABASE_URL` — Postgres connection string
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk auth
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe billing
- `SVIX_*` — Clerk webhook signing

## What this app stores

- Aggregated telemetry counts (searches, tokens saved, freshness percentages)
- Audit events (tool calls, applied rules, workflow transitions)
- Policy definitions (predefined and custom)
- Workflow snapshots (plan/review/approve state)
- Violation reports
- License and API key state

## What this app **never** stores

- Source code
- File contents
- Search queries (unless explicitly opted-in)
- Embeddings or graph data
- AI-generated code

The data boundary is enforced both by validators in `src/lib/validators/` (which reject raw-content payloads) and by the enterprise plugin's push pipeline. See [`cortex-enterprise/docs/DATA_BOUNDARY_AND_TELEMETRY.md`](../cortex-enterprise/docs/DATA_BOUNDARY_AND_TELEMETRY.md).

## Compliance posture

The dashboard reports against:

- **Baseline frameworks (active):** ISO 27001, ISO 42001, SOC 2 Type II
- **Planned EU regulatory packs:** GDPR, EU AI Act, NIS2 — surfaced as `plannedRegulatoryPacks` previews, not claimed as active product compliance

Authoritative compliance language: *"supports evidence and control mapping"* — never *"is compliant"* or *"makes the customer compliant"*.

See [`cortex-enterprise/docs/COMPLIANCE_CONTROL_MAPPING.md`](../cortex-enterprise/docs/COMPLIANCE_CONTROL_MAPPING.md).

## Deployment

Deployed via GitHub Actions to Vercel. Do not publish locally — push to `main` and let CI handle the rollout. Database migrations run during `next build` (`scripts/migrate.mjs`).

For one-off telemetry cleanup on the next deploy, set `CORTEX_RESET_TELEMETRY_KEY` to a unique value in the deploy environment. The build migration will truncate `telemetry_events`, `telemetry_daily`, and rebuild zeroed telemetry snapshots exactly once for that key; repeated deploys with the same key are skipped.

## Related repos

- [`cortex`](https://github.com/DanielBlomma/cortex) — public MIT MCP server (npm: `@danielblomma/cortex-mcp`)
- [`cortex-enterprise`](https://github.com/DanielBlomma/cortex-enterprise) — private enterprise plugin (npm: `@danielblomma/cortex-enterprise`)

## License

UNLICENSED — proprietary.
