# Dashboard Performance Plan

## Goals

- Stop aggregating raw telemetry for every dashboard page load.
- Move overview-critical metrics to pre-aggregated tables.
- Remove request-path schema work from read routes.
- Reduce overview roundtrips and duplicate database scans.

## Rollout

1. Measure route latency and query time for:
   - `/api/v1/operations/summary`
   - `/api/v1/telemetry/summary`
   - `/api/v1/violations/summary`
   - `/api/v1/reviews/summary`
   - `/api/v1/audit/summary`
2. Remove `ensureRuntimeSchema()` from production read routes after migrations are trusted.
3. Use `telemetry_daily` as a real rollup table.
   - Write rollups during `telemetry/push`
   - Backfill from `telemetry_events`
   - Read totals and daily charts from `telemetry_daily`
4. Add `operations_snapshot` for overview and rollout status.
5. Add daily rollups for:
   - `violations_daily`
   - `reviews_daily`
   - `audit_daily`
   - `workflow_daily`
6. Collapse overview into a single summary fetch.

## Current Phase

Phase 1 is active:

- Save this plan in the repo
- Make `telemetry_daily` the source for telemetry totals and daily trends
- Keep raw `telemetry_events` only for distinct instances, versions, and latest-seen signals

## Follow-up

- Move `operations/summary` off raw scans as soon as `operations_snapshot` exists
- Replace live 30-day rollups with snapshot/rollup reads
- Remove runtime schema checks from read paths entirely
