# Phase 3c — Staff Dashboard Epic — COMPLETE

## Subtasks
- [x] task-05a — Layout, auth guard, API contracts
- [x] task-05b — Hero + Pending Questions + Recent Reports
- [x] task-05c — Assessments strip + skeleton audit
- [x] task-05d — Performance card + streak analytics
- [x] task-05e — Integration verification + rollup

## Utilities created
- `lib/utils/pending-question-utils.ts` — `hasPendingQuestions`, `getPendingQuestionCount`, `getPhaseDotColor`
- `lib/types/staff-incident-summary.ts` — `StaffIncidentSummary`
- `components/ui/completion-ring.tsx` — reusable SVG completion ring

## APIs created / extended
- GET `/api/staff/incidents` — reporter-only incident summaries
- GET `/api/staff/badge-counts` — staff tab badge polling endpoint
- GET `/api/staff/performance` — staff performance analytics (Redis-cached 10 min)
- GET `/api/assessments/due` — staff due assessments (7-day window)

## What comes next
- Phase 4 — Assessments (task-07): build the full assessment voice flow
- Phase 5 — Admin Dashboard real data (phase_3b already done)
- Phase 6 — Resident Story (task-08)

