## Status: DONE — 2026-05-21
# Task 26 — Report page + Answer Now + dashboard continue → ?incidentId=
## Phase: 9 — Report persistence & resume
## Estimated Time: 2–3 hours
## Depends On: task-25

---

## Why This Task Exists

Phase 7 shipped **“Answer Now”** linking to `/staff/report` with no `incidentId`, which **starts a new report**. Dashboard “in progress” cards must resume the correct incident.

---

## What This Task Modifies

1. `app/staff/report/page.tsx`
   - Read `incidentId` from `useSearchParams()`
   - On mount: if `incidentId` present, `GET /api/report/resume?incidentId=` and hydrate board state (do not call `report/start`)
   - Show loading / error states (session expired message, cannot resume)
2. `components/staff/staff-incident-detail-view.tsx`
   - “Answer Now” → `/staff/report?incidentId={incidentId}`
3. `app/staff/dashboard/staff-dashboard-client.tsx` (and/or `staff-incidents-list-client.tsx`)
   - In-progress incident cards → `/staff/report?incidentId=...` (primary CTA) plus link to detail
4. `lib/utils/pending-question-utils.ts` (optional)
   - `getPendingQuestionCount` — prefer counting unanswered non-IDT questions from API summary if available; document limitation until staff list API exposes count

---

## UX requirements

- Resume loading: skeleton or spinner; do not flash `type_select`
- If resume returns `warning`, toast once (session restored from saved data)
- If resume fails (409/400), toast + offer “View incident” link to detail
- Do not clear `incidentId` from URL on successful resume (refresh-safe)

---

## Success Criteria

- [ ] Open `/staff/report?incidentId=inc-xxx` restores board for in-progress report
- [ ] Answer Now on incident detail continues same incident
- [ ] Dashboard in-progress CTA opens resume URL
- [ ] Fresh report still works: `/staff/report` without query starts new flow
- [ ] `npm run build` passes

---

## Test Cases

```
TEST 1 — Deep link resume
  Setup: incident phase_1_in_progress with checkpointed questions
  Action: Navigate /staff/report?incidentId=...
  Expected: Tier 1/2 board shows prior answers; not type select

TEST 2 — Answer Now
  Action: From /staff/incidents/[id] Questions tab, tap Answer Now
  Expected: Lands on report with same incidentId in URL

TEST 3 — New report unchanged
  Action: Tap New Report from dashboard (no incidentId)
  Expected: type_select → resident → start creates new incident
```

---

## Implementation Prompt

```
Wire staff report resume UI (Phase 9 task 26).

Use GET /api/report/resume from task 25.
Update staff/report/page.tsx to hydrate from ?incidentId=.
Fix Answer Now and in-progress dashboard links to include incidentId query param.
Match existing report page phase machine (tier1_board, tier2_board, etc.).
```
