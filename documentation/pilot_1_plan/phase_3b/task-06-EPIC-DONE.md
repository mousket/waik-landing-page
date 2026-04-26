# Phase 3b — Admin Dashboard Epic — COMPLETE

## Subtasks

- [x] task-06a — Layout, auth guard, API contract — `task-06a-layout-api-contract.md` (spec retained without `-done` rename)
- [x] task-06b — Needs Attention tab + PATCH /phase — `task-06b-needs-attention-tab-done.md`
- [x] task-06c — Active Investigations tab + 48hr clock — `task-06c-active-investigations-tab-done.md`
- [x] task-06d — Closed tab + CSV export — `task-06d-closed-tab-csv-done.md`
- [x] task-06e — Stats sidebar + daily brief + Redis caching — `task-06e-stats-sidebar-daily-brief-done.md`
- [x] task-06f — IDT overdue section + push notification stub — `task-06f-idt-overdue-push-stub-done.md`
- [x] task-06g — Integration verification + rollup — `task-06g-integration-verification-done.md` (checklist + shared-fetch doc)

## Utilities

- `lib/utils/incident-classification.ts` — `classifyIncident`, `computeClock`, `isIdtOverdue`
- `lib/utils/csv-export.ts` — `generateClosedIncidentsCsv`, `downloadCsv`, `computeDaysToClose`
- `lib/utils/dashboard-trends.ts` — `trendGlyph` (stats sidebar)
- `lib/types/incident-summary.ts` — `IncidentSummary`, `IdtTeamMember`
- `lib/types/dashboard-stats.ts` — `DashboardStats`

## APIs

- `PATCH /api/incidents/[id]/phase` — phase transition + audit trail
- `GET /api/admin/dashboard-stats` — aggregations + 5-minute Redis cache
- `POST /api/push/send` — stub (real implementation in task-12)

## Integration note (task-06g)

`AdminDashboardShell` loads **one** open-incidents query for **Needs Attention** + **Active**; **Closed** and **dashboard-stats** stay separate fetches.

## Next

Phase **3c** — Staff dashboard (task-05 split into granular subtasks per `documentation/pilot_1_plan/phase_3c/`).
