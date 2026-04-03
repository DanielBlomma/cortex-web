# Cortex Web — Product Requirements Document

## 1. Overview

**Product:** cortex-web
**Type:** Multi-tenant SaaS portal
**Purpose:** Central management platform for cortex-enterprise — an MCP plugin for Claude Code that gives organizations governance, analytics, and policy control over AI coding assistants.

**Core value proposition:** Organizations get a single dashboard to manage licenses, push rules to all developers, see aggregated usage analytics, and maintain audit trails — while source code never leaves developer machines.

---

## 2. Product Context

### What is cortex-enterprise?

Cortex is a layer between codebases and AI coding assistants. It:
- Reads and indexes code locally on each developer's machine
- Feeds AI tools governed context filtered through organization rules
- Logs every AI interaction for audit/compliance
- Comes in three editions: Community (free/MIT), Connected (cloud), Air-Gapped (offline)

### Where cortex-web fits

```
Developer machines (cortex-enterprise installed locally)
    |                          ^
    | Telemetry push           | Policy sync
    | (usage stats, no code)   | (org rules)
    v                          |
+---+------ cortex-web -------+---+
|                                  |
|  License management              |
|  Policy/rule CRUD                |
|  Telemetry dashboard             |
|  Stripe billing                  |
|  API key management              |
|  Air-gapped license generation   |
|                                  |
+----------- Admin portal --------+
```

**Source code NEVER passes through cortex-web.** Only usage statistics (counts, not content) and policy rules flow between client and server.

---

## 3. Product Tiers

| Tier | Price | Target | How they use cortex-web |
|------|-------|--------|------------------------|
| **Community (MIT)** | Free | Individual devs, small teams | Don't use it — fully local, open source |
| **Connected** | ~$30/dev/month | Tech companies, 50-500 devs | Full portal access: dashboard, rules, analytics, API keys, billing |
| **Air-Gapped** | $50k-$200k/year | Banks, defense, govt, healthcare | License files generated in portal by Cortex admin, delivered offline |

### Connected edition features (served by cortex-web):
- Cloud dashboard with usage analytics across all developers
- Central policy/rule management (auto-syncs to all developer machines)
- License management (create, renew, download .lic files)
- Telemetry aggregation (searches, tokens saved, active instances)
- Role-based access control (admin / developer / readonly)
- SSO via company identity provider (Clerk)
- Audit trail (exportable for SOC2, ISO 27001)
- API key management for instance authentication

### Air-Gapped edition (managed via cortex-web by Cortex team):
- License file generation and signing (Ed25519)
- License lifecycle tracking (active, expiring, expired, revoked)
- Revenue tracking per air-gapped customer
- Renewal reminders
- No telemetry or policy sync (customer is completely offline)

---

## 4. Users & Roles

### Portal users (Connected customers):

| Role | Can do | Can't do |
|------|--------|----------|
| **Admin** | Manage rules, view all analytics, create API keys, manage licenses, manage billing, invite members | — |
| **Developer** | View own usage, view org analytics, view policies | Create/edit rules, manage billing, create API keys |
| **Readonly** | View dashboards | Change anything |

### Internal users (Cortex team):
- Generate air-gapped licenses for sales
- Track all customer licenses across editions
- View aggregated platform metrics

---

## 5. Functional Requirements

### 5.1 Authentication & Organizations

| Req | Description | Priority |
|-----|-------------|----------|
| AUTH-1 | User signup/login via Clerk | P0 |
| AUTH-2 | Organization creation and management | P0 |
| AUTH-3 | Organization member invitations | P0 |
| AUTH-4 | Role-based access (admin/developer/readonly) | P0 |
| AUTH-5 | SSO/SAML support for enterprise orgs | P1 |
| AUTH-6 | Sync Clerk users/orgs/memberships to database via webhooks | P0 |

### 5.2 License Management

| Req | Description | Priority |
|-----|-------------|----------|
| LIC-1 | Create Connected licenses (customer, edition, expiry, max_repos, features) | P0 |
| LIC-2 | Create Air-Gapped licenses (same fields, edition=air-gapped) | P0 |
| LIC-3 | Ed25519 signing of license payload | P0 |
| LIC-4 | Download signed .lic file (compatible with cortex-enterprise check.ts) | P0 |
| LIC-5 | List all org licenses with status indicators | P0 |
| LIC-6 | Revoke a license | P1 |
| LIC-7 | License expiry warnings (30 days before) | P1 |
| LIC-8 | License renewal flow (new license with extended expiry) | P1 |

**License file format** (must match cortex-enterprise):
```
customer: Acme Corp
edition: connected
issued: 2026-04-03
expires: 2027-04-03
max_repos: 50
features: telemetry,audit,policy,rbac
---
<base64 Ed25519 signature>
```

### 5.3 API Key Management

| Req | Description | Priority |
|-----|-------------|----------|
| KEY-1 | Generate API keys (ctx_ prefix + 32 random bytes, SHA-256 hash stored) | P0 |
| KEY-2 | Show key only once at creation time | P0 |
| KEY-3 | List keys with prefix display (ctx_7kR4...) and last used timestamp | P0 |
| KEY-4 | Revoke keys (soft delete) | P0 |
| KEY-5 | Key scopes (telemetry, policy) | P1 |
| KEY-6 | Key expiration | P2 |
| KEY-7 | Plan-based key limits (enforce max based on subscription) | P0 |

### 5.4 Telemetry & Analytics

| Req | Description | Priority |
|-----|-------------|----------|
| TEL-1 | Receive telemetry push via POST /api/v1/telemetry/push | P0 |
| TEL-2 | Validate Bearer API key on telemetry push | P0 |
| TEL-3 | Store raw telemetry events | P0 |
| TEL-4 | Daily aggregation of telemetry data | P0 |
| TEL-5 | Dashboard: total searches, tokens saved, active instances | P0 |
| TEL-6 | Dashboard: time-series charts (daily/weekly/monthly) | P0 |
| TEL-7 | Dashboard: per-metric breakdown (searches, lookups, reloads) | P1 |
| TEL-8 | Raw event retention: 90 days, then pruned | P2 |

**Telemetry push body** (from cortex-enterprise):
```json
{
  "period_start": "2026-04-03T08:00:00Z",
  "period_end": "2026-04-03T09:00:00Z",
  "searches": 142,
  "related_lookups": 89,
  "rule_lookups": 34,
  "reloads": 2,
  "total_results_returned": 1847,
  "estimated_tokens_saved": 45000
}
```

### 5.5 Policy Management

| Req | Description | Priority |
|-----|-------------|----------|
| POL-1 | Create org-wide policies (rule_id, description, priority, scope, enforce) | P0 |
| POL-2 | List all org policies | P0 |
| POL-3 | Edit existing policies | P0 |
| POL-4 | Delete policies | P0 |
| POL-5 | Serve policies via GET /api/v1/policy/sync (Bearer API key auth) | P0 |
| POL-6 | Policy sync response matches CloudResponseSchema | P0 |

**Policy sync response** (must match cortex-enterprise):
```json
{
  "rules": [
    {
      "id": "rule.no_deprecated",
      "description": "Hide deprecated code unless explicitly requested",
      "priority": 95,
      "scope": "global",
      "enforce": true
    }
  ]
}
```

### 5.6 Stripe Billing

| Req | Description | Priority |
|-----|-------------|----------|
| BIL-1 | Stripe Checkout for Connected plan subscription | P0 |
| BIL-2 | Stripe Billing Portal for subscription management | P0 |
| BIL-3 | Webhook handling: subscription created/updated/canceled | P0 |
| BIL-4 | Update org plan based on subscription status | P0 |
| BIL-5 | Plan enforcement: block features when no active subscription | P0 |
| BIL-6 | Billing page showing current plan and usage | P0 |
| BIL-7 | Free trial period (14 days) | P1 |

### 5.7 Landing Page

| Req | Description | Priority |
|-----|-------------|----------|
| LP-1 | Hero section with animated terminal/code visualization | P0 |
| LP-2 | "How It Works" section (3-step scroll animation) | P0 |
| LP-3 | Features section with staggered card reveals | P0 |
| LP-4 | Pricing section with 3 tiers (Community/Connected/Air-Gapped) | P0 |
| LP-5 | Final CTA section | P0 |
| LP-6 | Dark developer-focused theme (Linear/Vercel aesthetic) | P0 |
| LP-7 | Framer Motion scroll-triggered animations | P0 |
| LP-8 | Responsive design (mobile/tablet/desktop) | P0 |

---

## 6. API Contracts

### External API (used by cortex-enterprise instances)

Authentication: `Authorization: Bearer <api_key>` header on every request.

#### POST /api/v1/telemetry/push
- **Auth:** Bearer API key
- **Body:** TelemetryMetrics JSON (see TEL-1)
- **Response:** `{ "ok": true }` (200) or error
- **Behavior:** Validate key, extract org_id, insert telemetry_event, update key.last_used_at

#### GET /api/v1/policy/sync
- **Auth:** Bearer API key
- **Response:** `{ "rules": [...] }` matching CloudResponseSchema
- **Behavior:** Validate key, extract org_id, query policies, map to response format

### Internal API (used by dashboard)

Authentication: Clerk session JWT (via middleware).

#### Licenses
- `GET /api/v1/licenses` — List org licenses
- `POST /api/v1/licenses` — Create + sign new license
- `GET /api/v1/licenses/:id` — License detail
- `GET /api/v1/licenses/:id/download` — Download signed .lic file

#### Policies
- `GET /api/v1/policies` — List org policies
- `POST /api/v1/policies` — Create policy
- `GET /api/v1/policies/:id` — Policy detail
- `PUT /api/v1/policies/:id` — Update policy
- `DELETE /api/v1/policies/:id` — Delete policy

#### API Keys
- `GET /api/v1/api-keys` — List org keys
- `POST /api/v1/api-keys` — Create key (returns raw key once)
- `DELETE /api/v1/api-keys/:id` — Revoke key

#### Analytics
- `GET /api/v1/analytics/summary` — Aggregated totals
- `GET /api/v1/analytics/daily?from=&to=` — Daily time series

#### Billing
- `POST /api/v1/billing/checkout` — Create Stripe Checkout session
- `POST /api/v1/billing/portal` — Create Stripe Billing Portal session

### Webhooks
- `POST /api/webhooks/clerk` — Svix signature verification, sync users/orgs/memberships
- `POST /api/webhooks/stripe` — Stripe signature verification, sync subscription status

---

## 7. Data Privacy & Security

| Concern | Approach |
|---------|----------|
| Source code exposure | Source code NEVER passes through cortex-web. Only numeric telemetry stats flow. |
| API key storage | Only SHA-256 hashes stored. Raw key shown once at creation. |
| Ed25519 private key | Stored as environment variable, never in database or git. |
| Multi-tenant isolation | All queries scoped by org_id. Application-level enforcement. |
| Webhook verification | Clerk: Svix signature. Stripe: Stripe signature. |
| Session management | Handled by Clerk (JWT-based). |

---

## 8. Tech Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| Framework | Next.js 14+ (App Router) | Full-stack React, API routes, SSR |
| Language | TypeScript | Type safety across stack |
| Database | PostgreSQL (Docker) | Reliable, org_id-scoped multi-tenancy |
| ORM | Drizzle ORM | Type-safe queries, lightweight, good migrations |
| Auth | Clerk | Built-in organizations, roles, SSO, webhooks |
| Billing | Stripe | Industry standard for SaaS billing |
| UI | Tailwind CSS + shadcn/ui | Consistent, accessible components |
| Animations | Framer Motion | Scroll-triggered animations for landing page |
| Deployment | Docker Compose | Self-hosted, cheap (any VPS ~$5/mo) |

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Telemetry push latency | < 200ms p95 |
| Policy sync latency | < 100ms p95 |
| Dashboard page load | < 2s |
| Uptime | 99.9% (affects all connected instances' ability to sync) |
| Data retention (raw telemetry) | 90 days |
| Data retention (aggregated) | Indefinite |
| Concurrent instances per org | 500+ |
| Docker image size | < 500MB |

---

## 10. Implementation Phases

### Phase 1: Foundation
- Next.js project setup, Docker Compose, database schema
- Landing page with scrolltelling
- Clerk auth integration
- Dashboard layout shell

### Phase 2: Core API
- API key management (create, list, revoke)
- Telemetry push endpoint
- Policy sync endpoint
- Plan enforcement

### Phase 3: Dashboard Features
- Policy CRUD UI
- License management UI (Connected + Air-Gapped)
- Analytics dashboard with charts
- Billing integration (Stripe)

### Phase 4: Polish
- License expiry notifications
- Telemetry retention jobs
- Rate limiting on external APIs
- Responsive design audit
- End-to-end testing with real cortex-enterprise instance

---

## 11. Success Criteria

1. A cortex-enterprise instance can authenticate with an API key, push telemetry, and sync policies
2. An admin can create and download signed license files (both Connected and Air-Gapped)
3. Analytics dashboard shows aggregated telemetry across all org instances
4. Stripe billing controls access to Connected features
5. Landing page loads fast, looks professional, and converts visitors to signups
6. Entire stack runs via `docker compose up` on a $5/mo VPS

---

## 12. Open Questions

1. Should there be a free trial period for Connected? If so, how long? (suggested: 14 days)
2. Exact Stripe price points — is $30/dev/mo the final price?
3. Should air-gapped license generation be restricted to a "super admin" role?
4. Do we need email notifications for license expiry, or is dashboard-only sufficient?
5. Should the telemetry dashboard be shareable via public link (for exec reporting)?
