# Task 5c2-11 — Data Contracts + Endpoints for Trends (Done)
## Phase: 5c-2 — Admin/DON Executive View (Trends)

---

## Outcome

- **Types**: `lib/types/trends-snapshot.ts` (`TrendsSnapshotPayload`, schema v1) composes all per-card response types.
- **Shared loader**: `lib/admin/load-trends-incident-pool.ts` — one Mongo fetch (current + previous windows + 7d lookback for repeat metrics).
- **Builder**: `lib/admin/build-trends-snapshot.ts` — same path as individual card metrics.
- **Drilldowns**: `lib/admin/trends-drilldowns.ts` — stable `/admin/incidents` and `/admin/residents` href helpers.
- **Snapshot API**: `GET /api/admin/trends/snapshot?range=7d|30d|90d` — compact envelope, no raw incident list.
- **Per-card APIs** retained (`/api/admin/trends/*`) and refactored to use `loadTrendsIncidentPool` for consistent date scope.

---

## Success Criteria (verified)

- [x] Types exist in `lib/types/…` for Trends payloads.
- [x] Cards can render from a small number of endpoints (single snapshot fetch via `TrendsSnapshotProvider`).
- [x] Drilldowns are consistent and reliable (`trends-drilldowns.ts` + existing parse helpers).
