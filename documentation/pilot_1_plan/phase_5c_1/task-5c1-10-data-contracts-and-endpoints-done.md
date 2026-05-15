# Task 5c1-10 — Data Contracts + Endpoints for Daily Command (Done)
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 3–6 hours

---

## Outcome

- **Types**: `lib/types/daily-command-today.ts` defines `DailyCommandTodayPayload` (schema v1) with sections for A1 snapshot header, A2 highest risk, A3 needs-attention preview, A6 high-risk residents, A7 staff throughput (plus repeat-7d count in the header).
- **Stable drilldown builders**: `lib/admin/daily-command-drilldowns.ts` centralizes `/admin/incidents?…` query construction aligned with `drilldowns-map.md`; `AdminCommandHeaderCard` now uses these helpers.
- **Shared domain logic** (server- and client-safe, no `"use client"`):
  - `lib/admin/daily-command-snapshot-header.ts` — A1 counts + protection + repeat-7d count
  - `lib/admin/daily-command-highest-risk.ts` — A2 ranking
  - `lib/admin/daily-command-needs-attention-preview.ts` — A3 preview slice
  - `lib/admin/daily-command-high-risk-residents.ts` — A6 row builder
  - `lib/admin/daily-command-staff-throughput.ts` — A7 outlier model
  - `lib/admin/build-daily-command-today.ts` — composes the full envelope
- **Endpoint**: `GET /api/admin/daily-command/today` returns the compact JSON envelope (no full incident array). Uses optional Redis read for cached dashboard stats to align protection logic with the header when cache is warm.
- **UI**: A2, A3, A6, A7 cards now call the shared lib builders so behavior matches the API contract.

---

## Success Criteria (verified)

- [x] Types exist in `lib/types/daily-command-today.ts` for the payload.
- [x] Cards render from the same logic as the new aggregate endpoint (single builder path).
- [x] Deep link parameters stay consistent via `daily-command-drilldowns.ts` + `drilldowns-map.md` update.
