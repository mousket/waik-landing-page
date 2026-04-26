# Task 05e — Integration Verification + Staff Dashboard Rollup
## Phase: 3c — Staff Dashboard
## Estimated Time: 1 hour
## Depends On: task-05a through task-05d (all complete)

---

## Why This Task Exists

Four subtasks have built the complete staff dashboard. Each was tested
in isolation. This task proves the dashboard works correctly for three
different staff personas simultaneously — each logged-in user sees only
their own data, in the correct state, with correct counts and colors.

No new code is written here. This is manual verification followed by
documentation.

---

## Three Persona Verification (run each independently)

### Persona 1 — Maria Torres (RN, primary reporter)
Sign in as: `m.torres@sunrisemn.com` / `WaiK@Seed2026!`

Expected dashboard state:
- [ ] Amber "continue" banner visible (INC-003 is her in-progress report)
- [ ] Banner links to /staff/incidents/inc-003
- [ ] Pending Questions: INC-003 visible — "Room 515", "Fall", "1 question remaining", "88%"
- [ ] Pending Questions: INC-001, INC-002 NOT visible (other nurses' incidents)
- [ ] Recent Reports shows 5 rows: INC-003 (amber), INC-004 (amber), INC-006 (blue), INC-007 (blue), INC-009 (teal)
- [ ] Assessments section shows ASSESS-003 (Room 204, activity, 1 day)
- [ ] Performance card collapsed showing ≈ 87% in teal (≥ 85%)
- [ ] Performance card expands correctly
- [ ] Streak card NOT shown (currentStreak = 2, below threshold of 3)
- [ ] Tab bar Home badge = 1, Assessments badge = 1, Intelligence badge = 0

### Persona 2 — Linda Osei (CNA, one pending report)
Sign in as: `l.osei@sunrisemn.com` / `WaiK@Seed2026!`

Expected dashboard state:
- [ ] Amber "continue" banner visible (INC-001 is her in-progress report)
- [ ] Banner links to /staff/incidents/inc-001
- [ ] Pending Questions: INC-001 visible — "Room 102", "Fall", "6 questions remaining", "42%"
- [ ] Recent Reports shows 1 row (INC-001 only)
- [ ] Assessments section hidden (no assessments assigned to Linda)
- [ ] Performance card shows 0% or N/A (no completed reports)
- [ ] Tab bar Home badge = 1, Assessments badge = 0

### Persona 3 — Dr. Sarah Kim (DON — admin tier)
Sign in as: `s.kim@sunrisemn.com` / `WaiK@Seed2026!`

Expected behavior:
- [ ] /staff/dashboard redirects to /admin/dashboard immediately
- [ ] Staff dashboard content is NOT visible to DON

---

## Full Integration Checklist

### Layout and Auth (task-05a)
- [ ] GET /api/staff/incidents called once on dashboard load (not multiple times)
- [ ] GET /api/staff/badge-counts called on mount and every 60 seconds
- [ ] Admin roles redirected at layout level before any staff content renders
- [ ] Bottom tab bar badges update after 60-second poll interval

### API Responses (task-05a)
- [ ] GET /api/staff/incidents returns only staffId === currentUser incidents
- [ ] Response includes completenessScore, tier2QuestionsGenerated, questionsAnswered
- [ ] No residentName field present in any API response

### Hero + Pending (task-05b)
- [ ] Report Incident button visible at top of 375px viewport
- [ ] Amber banner appears for nurses with in-progress incidents
- [ ] Pending cards sorted oldest-first
- [ ] Empty state shows for nurses with no pending questions
- [ ] CompletionRing renders correct percentage

### Assessments (task-05c)
- [ ] Section hidden when no assessments due within 7 days
- [ ] Section shows when assessments due
- [ ] Skeletons same height as real content (no layout shift)

### Performance (task-05d)
- [ ] /api/staff/performance returns correct numbers for Maria
- [ ] Redis cache hit on second load (check network tab — faster response)
- [ ] Collapsed card shows correct score with correct color
- [ ] Expanded card shows correct streak count

### Build Gate
- [ ] npm run build passes with zero TypeScript errors
- [ ] npm run test passes
- [ ] No console errors when loading dashboard as any of the three personas
- [ ] Network tab: no unexpected duplicate API calls on load

---

## Data Sharing Verification

The dashboard makes these API calls on load:
  1. GET /api/staff/incidents (hero banner + pending + recent — shared)
  2. GET /api/assessments/due (assessments section)
  3. GET /api/staff/performance (performance card)

Verify: the hero banner, pending questions section, and recent reports
ALL use the same `incidents` state — only ONE call to /api/staff/incidents.
Check Network tab: exactly one request to that route on initial load.

---

## Documentation to Produce

After all checklist items pass:

1. Complete `documentation/waik/10-STAFF-DASHBOARD.md`:
   - Architecture diagram (data flow + component tree)
   - API contracts: StaffIncidentSummary type, BadgeCounts, StaffPerformance
   - Pending question rule: authoritative definition
   - Streak definition: consecutive above-85% newest first
   - Performance caching: Redis key pattern, TTL, invalidation point
   - Privacy: no resident PHI in any API response or UI element
   - Mobile: 48px targets, 375px viewport requirement

2. Update `documentation/waik/03-API-REFERENCE.md`:
   - GET /api/staff/incidents (extended shape)
   - GET /api/staff/badge-counts
   - GET /api/staff/performance
   - GET /api/assessments/due

3. Create `plan/pilot_1/phase_3c/task-05-EPIC-DONE.md`

---

## No Implementation Prompt

This task is manual verification and documentation only.
If a checklist item fails: open a targeted Cursor session for the
relevant subtask and fix the specific issue.

