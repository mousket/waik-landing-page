# Task 06g — Integration Verification + Admin Dashboard Rollup
## Phase: 3b — Admin Dashboard
## Estimated Time: 1 hour
## Depends On: task-06a through task-06f (all complete)

---

## Why This Task Exists

Six subtasks have built six distinct parts of the admin dashboard. Each
was tested in isolation. This task verifies the system works as a whole
— that the tabs share data efficiently, the role gates work end-to-end,
the clock updates correctly, and no seed incident is missing or
duplicated across the three tabs.

This task is primarily a **manual integration checklist**. **Rollup delivered in repo:** shared incident fetch for Needs Attention + Active (`AdminDashboardShell` + props), **`documentation/waik/11-ADMIN-DASHBOARD.md`** Command Center section (mermaid + gates + types), **`documentation/waik/03-API-REFERENCE.md`** `PATCH /api/incidents/[id]/phase`, **`task-06-EPIC-DONE.md`**, and this file renamed to **`*-done.md`**.

---

## Integration Checklist

Work through each item. Check the box when verified. Any item that fails
gets a targeted fix in the relevant subtask file before closing this task.

### Auth and Role Gates (task-06a)
- [ ] DON (s.kim@sunrisemn.com) can access /admin/dashboard
- [ ] Administrator (p.walsh@sunrisemn.com) can access /admin/dashboard
- [ ] RN (m.torres@sunrisemn.com) navigating to /admin/dashboard redirects to /staff/dashboard
- [ ] Super admin (gerard@waik.care) can access /admin/dashboard
- [ ] GET /api/incidents without auth returns 401
- [ ] GET /api/incidents with RN token returns 403 (not admin tier) OR redirected at layout

### API Contract (task-06a)
- [ ] GET /api/incidents returns residentRoom but NOT residentName
- [ ] GET /api/incidents?phase=phase_1_complete returns only phase_1_complete
- [ ] GET /api/incidents?days=30 returns all 10 seed incidents (all within 30 days)
- [ ] idtTeam array contains questionSent, questionSentAt, response, respondedAt

### Needs Attention Tab (task-06b)
- [ ] INC-003 (injury, in_progress) shows as red alert
- [ ] INC-004 (injury, phase_1_complete) shows as red alert
- [ ] INC-005 (no injury, phase_1_complete) shows as yellow awaiting
- [ ] Kevin Park (INC-006, overdue 18hrs) shows in overdue IDT section
- [ ] Tab count badge = 2 (red) + 1 (yellow) + 1 (overdue) = 4
- [ ] "Claim" on INC-005 transitions it to phase_2_in_progress in MongoDB
- [ ] After claim: INC-005 disappears from Needs Attention, appears in Active tab
- [ ] No resident name visible anywhere on any card

### Active Investigations Tab (task-06c)
- [ ] INC-006 shows amber clock (~28h remaining)
- [ ] INC-007 shows red clock (~5h remaining)
- [ ] INC-008 shows gray clock (~44h remaining)
- [ ] Table sorted: INC-007 first, INC-006 second, INC-008 third
- [ ] "View" on INC-006 navigates to /admin/incidents/inc-006
- [ ] After claiming INC-005 in Needs Attention: it appears here too

### Closed Tab (task-06d)
- [ ] INC-009 visible (93%, 3 days to close)
- [ ] INC-010 visible (71%, 5 days to close)
- [ ] Export CSV downloads file with correct filename
- [ ] CSV contains 2 rows (INC-009 and INC-010 from seed)
- [ ] CSV has no resident name columns

### Stats Sidebar (task-06e)
- [ ] totalIncidents30d: 10 (all seed incidents within 30 days)
- [ ] avgCompleteness30d: approximately 80 (mean of all seed completeness scores)
- [ ] Trend arrows render (compare with prev30 — both show 0 for prev, so no arrows or →)
- [ ] Daily brief visible on first load
- [ ] Daily brief dismisses and does not reappear same day
- [ ] Intelligence search navigates to /admin/intelligence

### Push Stub (task-06f)
- [ ] Click "Send Reminder" on Kevin Park's overdue task
- [ ] POST /api/push/send returns { success: true, queued: true, delivered: false }
- [ ] Console shows the logged notification intent
- [ ] Button shows "Sent ✓" for 5 seconds, then resets

### Build Gate
- [ ] npm run build passes with zero TypeScript errors
- [ ] npm run test passes
- [ ] No console errors when loading any admin route in browser
- [ ] Network tab in DevTools: no unexpected duplicate API calls

---

## Data Sharing Verification

On load / refresh, the shell issues:

1. **One** `GET /api/incidents?phase=phase_1_in_progress,phase_1_complete,phase_2_in_progress` — shared by **Needs Attention** (including overdue IDT), **Active Investigations**, and refetched every **60s** from `AdminDashboardShell`.
2. `GET /api/incidents?phase=closed&days=30` — **Closed** tab only (`ClosedInvestigationsTab`).
3. `GET /api/admin/dashboard-stats` — **Stats** sidebar + daily brief.

**Verify in Network:** no duplicate `GET` for the same open-phase query from both tabs.

---

## Documentation produced (rollup)

1. `documentation/waik/11-ADMIN-DASHBOARD.md` — Command Center section added:
   - Architecture diagram (tab structure + API calls)
   - Role gates: who can access what
   - API contract: IncidentSummary type
   - Classification logic: red/yellow/none
   - Clock logic: 48hr standard, color thresholds
   - Privacy rule: room numbers only on cards
   - Stats caching: Redis key, TTL
   - Push stub: will be replaced in task-12

2. `documentation/waik/03-API-REFERENCE.md` — **`PATCH /api/incidents/[id]/phase`** added (dashboard-stats and push stub were already documented in 06e/06f).

3. Created **`documentation/pilot_1_plan/phase_3b/task-06-EPIC-DONE.md`** (canonical path in this repo; not under `plan/pilot_1/`).

---

## Original epic template (reference)

3. Create `plan/pilot_1/phase_3b/task-06-EPIC-DONE.md`:

```markdown
# Phase 3b — Admin Dashboard Epic — COMPLETE

## Subtasks
- [x] task-06a — Layout, auth guard, API contract
- [x] task-06b — Needs Attention tab + PATCH /phase
- [x] task-06c — Active Investigations tab + 48hr clock
- [x] task-06d — Closed tab + CSV export
- [x] task-06e — Stats sidebar + daily brief + Redis caching
- [x] task-06f — IDT overdue section + push notification stub
- [x] task-06g — Integration verification + rollup

## Utilities created
- lib/utils/incident-classification.ts — classifyIncident, computeClock, isIdtOverdue
- lib/utils/csv-export.ts — generateClosedIncidentsCsv, downloadCsv
- lib/types/incident-summary.ts — IncidentSummary, IdtTeamMember

## APIs created
- PATCH /api/incidents/[id]/phase — phase transition with audit trail
- GET /api/admin/dashboard-stats — aggregation with 5-min Redis cache
- POST /api/push/send — stub (real implementation in task-12)

## What comes next
Phase 3c — Staff Dashboard (task-05 split into granular subtasks)
```

---

## Manual checklist

Work through **Integration Checklist** and **Build Gate** above with seed users and DevTools. If any item fails, fix the underlying subtask and re-run verification.
