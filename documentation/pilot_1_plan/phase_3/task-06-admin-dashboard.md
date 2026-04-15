# Task 06 — Rebuild Admin Dashboard (Command Center)
## Phase: 3 — Dashboard Rebuilds
## Estimated Time: 5–6 hours
## Depends On: task-01, task-02, task-05

---

## Why This Task Exists

The current admin dashboard is the same flat incident list as the staff
dashboard with slightly different filters. A DON opening WAiK at 7am needs
something categorically different: what is on fire, what needs my decision in
the next hour, what is already past due, and what will expose the facility to
regulatory or legal risk if it stays untouched.

The flat list forces her to reconstruct that picture herself. This dashboard
does it for her — in priority order, with the most urgent item always at the
top and the clock always visible.

Two decisions from the second co-founder meeting changed this task significantly.
First: Phase 2 closure now has a 48-hour gold standard from Phase 1 sign-off.
That clock belongs on this dashboard as a visible countdown for every active
investigation. Second: the DON needs to see previous interventions for a
resident without leaving WAiK. A quick-context panel in the sidebar surfaces
that for the incident currently selected.

This task implements Screen 12 of the UI Specification (Pass 2).

---

## Context Files

- `app/admin/dashboard/page.tsx` — full replacement
- `app/admin/layout.tsx` — top navigation bar
- `lib/auth.ts` — getCurrentUser(), canAccessPhase2()
- `app/api/incidents/route.ts` — data source
- `backend/src/models/intervention.model.ts` — created in task-02

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] Daily brief appears once per calendar day, dismissible, does not re-appear same day
- [ ] "Needs Attention" is the default active tab with count badge
- [ ] Red alert cards appear for incidents with `hasInjury === true`
- [ ] Red alert cards appear for Phase 1 incidents open > 4 hours
- [ ] Yellow cards appear for Phase 1 complete incidents waiting > 2 hours, no injury
- [ ] "Claim Investigation" transitions incident to phase_2_in_progress
- [ ] Active Investigations tab shows 48-hour countdown clock per incident
- [ ] 48-hour clock turns amber when < 24 hours remain
- [ ] 48-hour clock turns red when < 6 hours remain
- [ ] Overdue IDT tasks section shows tasks > 24 hours without response
- [ ] "Send Reminder" on overdue IDT task fires push notification
- [ ] Closed tab shows last 30 days with Export CSV
- [ ] Quick stats panel shows 4 metrics with trend arrows
- [ ] Top nav: Dashboard | Incidents | Assessments | Residents | Intelligence | Settings
- [ ] Notification bell shows unread count
- [ ] Loading skeletons on all three tabs while fetching

---

## Test Cases

```
TEST 1 — Daily brief dismissed for day
  Action: Load dashboard. Dismiss daily brief.
          Set system clock forward 1 hour. Reload page.
  Expected: Daily brief does not reappear same calendar day
  Pass/Fail: ___

TEST 2 — Daily brief reappears next day
  Action: Set localStorage "waik-brief-dismissed" date to yesterday. Reload.
  Expected: Daily brief appears
  Pass/Fail: ___

TEST 3 — Red alert for injury incident
  Setup: Create incident with hasInjury = true, phase = phase_1_complete
  Action: Load Needs Attention tab
  Expected: Red left-border card with injury warning appears
  Pass/Fail: ___

TEST 4 — Red alert for old Phase 1 incident
  Setup: Create phase_1_in_progress incident with startedAt = 5 hours ago, no injury
  Action: Load Needs Attention tab
  Expected: Red left-border card appears (> 4 hours threshold)
  Pass/Fail: ___

TEST 5 — Yellow card for Phase 1 complete awaiting claim
  Setup: Create incident phase = phase_1_complete, phase1SignedAt = 3 hours ago, no injury
  Action: Load Needs Attention tab
  Expected: Yellow left-border card appears
  Pass/Fail: ___

TEST 6 — Claim Investigation transitions phase
  Action: Click "Claim" on a yellow card
  Expected: Incident moves to phase_2_in_progress. Card disappears from Needs Attention.
            Incident appears in Active Investigations tab.
  Pass/Fail: ___

TEST 7 — 48-hour countdown renders correctly
  Setup: Create phase_2_in_progress incident where phase1SignedAt was 20 hours ago
  Action: View Active Investigations tab
  Expected: Clock shows "28 hours remaining" in amber color
  Pass/Fail: ___

TEST 8 — Clock turns red under 6 hours
  Setup: Incident where phase1SignedAt was 43 hours ago
  Action: View Active Investigations tab
  Expected: Clock shows "5 hours remaining" in red
  Pass/Fail: ___

TEST 9 — Overdue IDT task shown
  Setup: Create Phase 2 incident with IDT task assigned 30 hours ago, not yet answered
  Action: Load Needs Attention tab, scroll to Overdue IDT Tasks section
  Expected: Task appears with "30 hours overdue" indicator and Send Reminder button
  Pass/Fail: ___

TEST 10 — Export CSV downloads
  Action: Click Export CSV on Closed tab
  Expected: CSV file downloads. Headers include: roomNumber, incidentType,
            completenessAtSignoff, phase1SignedAt, phase2LockedAt, reportedBy
  Pass/Fail: ___

TEST 11 — Quick stats trend arrows correct
  Setup: Mock this month avg completeness = 82%, last month = 75%
  Expected: Completeness stat shows green ↑ arrow
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm rebuilding the admin dashboard for WAiK (Next.js 14) as a command center
matching UI Specification Screen 12. This screen is for Directors of Nursing
and Administrators.

PERSONA: DON opening WAiK at 7am. Needs to know: what is on fire, what needs
my decision today, what is overdue, what carries legal or regulatory risk.

DESIGN: Desktop-first, responsive. Priority hierarchy: urgent (red) →
attention needed (yellow) → active (blue) → routine (gray). Teal color scheme.
shadcn/ui components. Loading skeletons while fetching.

PART A — REPLACE app/admin/dashboard/page.tsx

DAILY BRIEF (shown once per calendar day):
Store dismissed date in localStorage "waik-brief-dismissed".
If today's date !== stored date: show card.
Text: "Good morning [name]. [X] open investigations — [X] staff questions
pending — [X] assessments due today."
Dismiss button (X). Hides for rest of calendar day.

THREE TABS (shadcn Tabs, default = Needs Attention):

TAB 1 — NEEDS ATTENTION (count badge = total items across A+B+C):

  SECTION A — RED ALERTS:
  Condition: hasInjury === true OR (phase === phase_1_in_progress AND startedAt
  is > 4 hours ago).
  Full-width card with red left border (4px solid #C0392B).
  Contents:
    - Room number + incident type (NOT resident name — for personal device safety)
    - Reporting staff name and role
    - Time elapsed badge: "X hours ago"
    - If hasInjury: amber badge "⚠️  Injury reported — state notification may be required"
    - "Claim Investigation" button → PATCH /api/incidents/[id]/phase
      body: { phase: "phase_2_in_progress", investigatorId, investigatorName }
      Requires canAccessPhase2() — return 403 if not DON/admin
    - After claim: card animates out, incident appears in Active tab

  SECTION B — AWAITING PHASE 2 CLAIM:
  Condition: phase === phase_1_complete AND phase1SignedAt is > 2 hours ago AND
  hasInjury === false.
  Yellow left-border card (4px solid #E8A838).
  Contents: room number, incident type, Phase 1 completeness badge, time since
  Phase 1 was signed, "Claim" button (same behavior as above).

  SECTION C — OVERDUE IDT TASKS:
  IDT tasks where assignedAt > 24 hours ago AND response is null.
  Card per task: assignee name + role, which incident (room number + type),
  hours overdue, "Send Reminder" button → POST /api/push/send {
    targetUserId, payload: { title: "Reminder: response needed",
    body: "Your input on a Phase 2 investigation is overdue." } }
  Button shows "Sent ✓" for 5 seconds after tapping.

  Empty state for all three: green card "No immediate action needed."

TAB 2 — ACTIVE INVESTIGATIONS (count badge):
Table on desktop, card stack on mobile.

Table columns:
  Room — Incident Type — Phase Badge — Completeness % — Open Tasks —
  48hr Clock — View button

48hr Clock column:
  Calculate hours elapsed since phase1SignedAt.
  hoursRemaining = 48 - hoursElapsed
  If hoursRemaining > 24: show "[X]h remaining" in muted gray
  If hoursRemaining 6-24: show "[X]h remaining" in amber
  If hoursRemaining < 6: show "[X]h remaining" in red bold
  If negative: show "Overdue by [X]h" in red bold

Sort default: most time-critical first (lowest hoursRemaining at top).
Filter select: All / Phase 1 in progress / Phase 1 complete / Phase 2 in progress
Show skeleton rows while loading.

TAB 3 — CLOSED (last 30 days):
Compact table: Room — Date — Score — Investigator — Days to Close
"Export CSV" button: generate CSV client-side from table data.
CSV headers: roomNumber, incidentType, completenessAtSignoff, phase1SignedAt,
phase2LockedAt, investigatorName, daysToClose

RIGHT SIDEBAR (desktop 280px) / BOTTOM SECTION (mobile):

Quick stats (last 30 days). Each stat: large number + label + trend arrow.
  Total incidents (number)
  Avg Phase 1 completeness (%) — compare to prior 30 days for arrow
  Avg days to close Phase 2 (number) — compare to prior 30 days for arrow
  % incidents with injury flag (%)

Upcoming assessments (next 7 days): compact list, resident room + type + days remaining.

Intelligence shortcut: search input labeled "Ask your community..."
On submit: navigate to /admin/intelligence?q={query}

PART B — UPDATE app/admin/layout.tsx

TOP NAVIGATION BAR:
Left: WAiK wordmark
Center links: Dashboard | Incidents | Assessments | Residents | Intelligence | Settings
Active link: teal underline
Right: notification bell with unread count badge → /admin/notifications
       Avatar (Clerk UserButton or initials circle)

On mobile: horizontal links collapse to a hamburger menu.

PART C — API CHANGES

PATCH /api/incidents/[id]/phase:
  Requires canAccessPhase2()
  Accepts: { phase: string, investigatorId?: string, investigatorName?: string }
  On transition to phase_2_in_progress:
    - Set incident.phase = "phase_2_in_progress"
    - Set incident.investigatorId and investigatorName
    - Set phaseTransitionTimestamps.phase2Claimed = Date.now()
    - Append to auditTrail: { action: "phase_transitioned", ... }
    - Fire Phase 2 trigger notification to DON + admin
    - Return updated incident

GET /api/incidents?facilityId=X&phase=Y:
  Already exists — ensure it returns phaseTransitionTimestamps and hasInjury.
  Add &days=30 param support for Closed tab.

Do not touch staff dashboard, staff layout, or any staff routes.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Rewrite `documentation/waik/11-ADMIN-DASHBOARD.md`
- Create `plan/pilot_1/phase_3/task-06-DONE.md`
