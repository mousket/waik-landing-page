# Task 5b-01 — Staff Dashboard Redesign
## Phase: 5b — Staff Experience Redesign
## Estimated Time: 3–4 hours
## Depends On: Phase 3c (task-05a through 05d complete), Phase 3b (admin dashboard complete)

---

## Why This Task Exists

The current staff dashboard is a vertical stack of white cards on a white
background. Functional but flat. The admin dashboard has spatial hierarchy,
a Command Center header, urgency-coded cards, and ambient status indicators.
A nurse looking at her dashboard should feel the same level of professional
clarity the DON gets — not a simplified version of it.

This task redesigns the staff dashboard into three distinct zones that match
the admin's information hierarchy while respecting the mobile-first
constraint and keeping the teal color identity the current design established.

**Design principle: same product, mobile perspective.**
The admin dashboard is desktop-first with a sidebar. The staff dashboard
is mobile-first with a bottom tab bar. But the card styles, badge colors,
phase indicators, and completeness rings should be visually identical
between the two. A nurse who has seen the admin dashboard should recognize
the same design language immediately.

---

## The Three Zones

### Zone 1 — Shift Header
Replaces the current flat "Dashboard / Your shift snapshot" title.

A full-width card at the top. Dark teal background (#0A3D40). Contains:
- "Good [morning/afternoon/evening], [firstName]" — personalized greeting
- "[Unit name]" if unit selected for the day — teal pill badge
- Three ambient status chips in a row:
  - 🔴 [N] pending if pendingQuestions > 0, else ✓ All caught up
  - 🟡 [N] in progress if in-progress incidents exist, else ✓ No open reports
  - 📋 [N] due if assessments due within 7 days, else ✓ Assessments clear
- Each chip is tappable: pending chip scrolls to Zone 2, in-progress chip
  scrolls to Zone 2, assessments chip navigates to /staff/assessments

This mirrors the admin's "Good evening, Gerard — Here's what needs your
attention" Command Center header, translated to the nurse's world.

### Zone 2 — Active Work
The action surface. Shows in-progress incidents requiring attention.

If incidents are in progress:
- Section heading: "Your open reports" with count badge
- One card per in-progress incident — styled identically to admin's
  Needs Attention cards but from the nurse's perspective
- Card: white background, left border color matches urgency
  - Amber border: phase_1_in_progress, no injury
  - Red border: phase_1_in_progress, hasInjury: true
  - Contains: room number, incident type badge, time elapsed, completeness
    ring, question count badge, "Continue Report" button

If nothing is in progress:
- Green empty state card: "✓ No open reports — ready for a new one"
- "Report Incident" button below the empty state

Report Incident button always exists at the bottom of Zone 2 as a
secondary action. It is the PRIMARY action when empty state shows, and
a smaller "New Report" button when cards exist.

### Zone 3 — My History
The awareness surface. Recent reports with admin-style visual language.

- Section heading: "Recent reports" with "View all →" link
- Last 5 incidents, newest first
- Each row: room number + incident type badge + formatted date +
  phase badge (same colors as admin's phase badges) + completeness %
- Tapping a row: /staff/incidents/[id]

Below history: the assessments strip (from task-05c) and the
performance card (from task-05d) — both unchanged in content,
restyled to match the new visual hierarchy.

---

## Shared Components to Extract

Before building this task, extract these from the admin dashboard into
`components/shared/`:

- `incident-card.tsx` — the card component used in admin's Needs Attention.
  Add a `perspective: "staff" | "admin"` prop to control which actions render.
- `phase-badge.tsx` — the colored pill badge showing phase state.
  Same component used in both admin table and staff history list.
- `completeness-ring.tsx` — already built in task-05b as completion-ring.tsx.
  Move to components/shared/ and update all imports.

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] Zone 1: dark teal shift header with personalized greeting
- [ ] Zone 1: unit pill badge visible when unit selected for day
- [ ] Zone 1: three status chips showing correct counts
- [ ] Zone 1: status chips are tappable shortcuts to relevant sections
- [ ] Zone 2: in-progress incident cards styled with left border urgency color
- [ ] Zone 2: red border for injury-flagged in-progress incidents
- [ ] Zone 2: amber border for non-injury in-progress incidents
- [ ] Zone 2: each card shows room, type, elapsed time, ring, question count, Continue button
- [ ] Zone 2: green empty state when no open reports
- [ ] Zone 2: Report Incident button visible and prominent
- [ ] Zone 3: recent reports rows with phase badges matching admin's colors
- [ ] Zone 3: tapping row navigates to /staff/incidents/[id]
- [ ] Components moved to components/shared/ with no broken imports
- [ ] Admin dashboard imports from shared components without visual change
- [ ] All minimum 48px touch targets maintained
- [ ] 375px viewport: Zone 1 visible without scrolling

---

## Test Cases

```
TEST 1 — Shift header greeting correct
  Action: Sign in as m.torres@sunrisemn.com at 9am
  Expected: "Good morning, Maria" visible in dark teal header
  Pass/Fail: ___

TEST 2 — Unit pill shows selected unit
  Action: Maria has selectedUnit "Wing A — East" for today
  Expected: "Wing A — East" pill visible in header
  Pass/Fail: ___

TEST 3 — Status chips correct for Maria
  Action: Load dashboard (INC-003 pending, 1 assessment due)
  Expected: Red chip "1 pending", amber chip "1 in progress", yellow chip "1 due"
  Pass/Fail: ___

TEST 4 — Pending chip scrolls to Zone 2
  Action: Tap the pending chip
  Expected: Page scrolls to "Your open reports" section
  Pass/Fail: ___

TEST 5 — In-progress card has red border for INC-003 (injury)
  Action: Load dashboard as Maria (INC-003 has hasInjury: true)
  Expected: INC-003 card has red left border
  Pass/Fail: ___

TEST 6 — Continue Report navigates correctly
  Action: Click "Continue Report" on INC-003 card
  Expected: Navigate to /staff/incidents/inc-003
  Pass/Fail: ___

TEST 7 — Empty state when no open reports
  Action: Sign in as user with all incidents in phase_1_complete or later
  Expected: Green "No open reports — ready for a new one" card visible
            "Report Incident" button prominent below
  Pass/Fail: ___

TEST 8 — Zone 3 phase badges match admin colors
  Action: View Recent Reports section
  Expected: phase_1_in_progress → same amber as admin dashboard
            phase_2_in_progress → same blue as admin dashboard
            closed → same teal as admin dashboard
  Pass/Fail: ___

TEST 9 — Admin dashboard visually unchanged after shared component extraction
  Action: Load /admin/dashboard as DON
  Expected: Identical appearance to before this task ran
  Pass/Fail: ___

TEST 10 — 375px viewport Zone 1 visible without scroll
  Action: Load dashboard at 375px width
  Expected: Entire shift header visible in viewport without scrolling
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm redesigning the WAiK staff dashboard to match the visual and structural
quality of the admin dashboard. Same design language, mobile-first
perspective.

PART A — EXTRACT SHARED COMPONENTS

Create components/shared/ directory.

1. Move components/ui/completion-ring.tsx to components/shared/completion-ring.tsx
   Update all existing imports across the codebase.

2. Create components/shared/phase-badge.tsx:
   interface PhaseBadgeProps {
     phase: "phase_1_in_progress" | "phase_1_complete" | "phase_2_in_progress" | "closed"
     size?: "sm" | "md"
   }
   
   Renders a colored pill badge:
   phase_1_in_progress → amber background (#FBF0D9), amber text (#E8A838): "Phase 1 Active"
   phase_1_complete → yellow background (#FEF9C3), yellow-dark text: "Phase 1 Complete"
   phase_2_in_progress → blue background (#EFF6FF), blue text (#2E86DE): "Phase 2 Active"
   closed → teal background (#EEF8F8), teal text (#0D7377): "Closed"

3. Create components/shared/incident-card.tsx:
   Used in BOTH admin Needs Attention and staff Active Work zones.
   
   interface IncidentCardProps {
     incident: StaffIncidentSummary | IncidentSummary
     perspective: "staff" | "admin"
     onClaim?: () => void      // admin only
     onContinue?: () => void   // staff only
   }
   
   Always shows: room number, incident type badge, time elapsed (date-fns),
   hasInjury indicator, completeness ring, reported by name
   
   Staff perspective adds: question count badge, "Continue Report" button
   Admin perspective adds: "Claim Investigation" button (if phase_1_complete)
   
   Border color logic:
   If hasInjury: 4px left border #C0392B (red)
   Else if phase_1_in_progress: 4px left border #E8A838 (amber)
   Else if phase_2_in_progress: 4px left border #2E86DE (blue)

Update admin dashboard (app/admin/dashboard/) to use IncidentCard with
perspective="admin". Verify visual output is identical to before.

PART B — SHIFT HEADER COMPONENT

Create components/staff/shift-header.tsx ("use client"):

interface ShiftHeaderProps {
  firstName: string
  selectedUnit: string | null
  pendingCount: number
  inProgressCount: number
  assessmentsDueCount: number
  onPendingChipClick: () => void
  onInProgressChipClick: () => void
}

Layout:
  Full-width card, background #0A3D40 (dark teal), border-radius 0 on top,
  16px border-radius on bottom, padding 20px

  Row 1: Greeting
    Greeting text: "Good [morning/afternoon/evening], [firstName]"
    text-white font-bold text-2xl
    
    Time of day logic:
    0-11: "morning", 12-17: "afternoon", 18-23: "evening"
    const hour = new Date().getHours()
    
    If selectedUnit: teal pill badge next to name:
    "[unit]" — bg-teal/20 text-white border border-teal/40 px-2 py-0.5 rounded-full text-sm

  Row 2: Status Chips (flex gap-2, mt-3, flex-wrap)
    Three chips. Each chip: rounded-full px-3 py-1.5 text-sm font-medium
    cursor-pointer, min-h-9
    
    Chip 1 — Pending:
    If pendingCount > 0:
      bg-red-100 text-red-700 border border-red-200: "🔴 [N] pending"
      onClick: onPendingChipClick
    Else:
      bg-green-100 text-green-700 border border-green-200: "✓ All caught up"
    
    Chip 2 — In Progress:
    If inProgressCount > 0:
      bg-amber-100 text-amber-700 border border-amber-200: "⚡ [N] in progress"
      onClick: onInProgressChipClick
    Else:
      bg-green-100 text-green-700 border border-green-200: "✓ No open reports"
    
    Chip 3 — Assessments:
    If assessmentsDueCount > 0:
      bg-blue-100 text-blue-700 border border-blue-200: "📋 [N] due"
      onClick: scroll to assessments section
    Else:
      bg-green-100 text-green-700 border border-green-200: "✓ Assessments clear"

PART C — REBUILD app/staff/dashboard/page.tsx

Replace the current page with the three-zone layout.

Data fetching (existing hooks from task-05a/05b — keep as-is):
  incidents → used for all three zones
  assessments → assessments strip
  perf → performance card
  badges → from context (task-05a)

Derive from incidents:
  const inProgress = incidents.filter(i => i.phase === "phase_1_in_progress")
  const pending = inProgress.filter(i => i.completenessScore < 100)
  const recent = [...incidents].sort(...).slice(0, 5)

ZONE 1 — SHIFT HEADER:
  <ShiftHeader
    firstName={currentUser.firstName}
    selectedUnit={currentUser.selectedUnit ?? null}
    pendingCount={pending.length}
    inProgressCount={inProgress.length}
    assessmentsDueCount={assessments.length}
    onPendingChipClick={() => pendingRef.current?.scrollIntoView({ behavior: "smooth" })}
    onInProgressChipClick={() => pendingRef.current?.scrollIntoView({ behavior: "smooth" })}
  />

ZONE 2 — ACTIVE WORK:
  <section ref={pendingRef} className="px-4 mt-4">
    
    {inProgress.length > 0 ? (
      <>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-dark-teal">Your open reports</h2>
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
            {inProgress.length}
          </span>
        </div>
        
        {inProgress.map(inc => (
          <IncidentCard
            key={inc.id}
            incident={inc}
            perspective="staff"
            onContinue={() => router.push(`/staff/incidents/${inc.id}`)}
          />
        ))}
        
        {/* Secondary Report Button when cards exist */}
        <button
          onClick={() => router.push("/staff/report")}
          className="w-full mt-3 border-2 border-teal text-teal font-semibold
                     py-3 rounded-xl text-center"
        >
          + New Report
        </button>
      </>
    ) : (
      <>
        {/* Empty state + PRIMARY Report Button */}
        <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-4 mb-3">
          <p className="font-semibold text-green-800">✓ No open reports</p>
          <p className="text-green-700 text-sm">Ready for a new one.</p>
        </div>
        
        <button
          onClick={() => router.push("/staff/report")}
          className="w-full bg-teal text-white font-bold py-4 rounded-xl
                     flex items-center justify-center gap-2 text-lg"
        >
          🎤 Report Incident
        </button>
      </>
    )}
  </section>

ZONE 3 — MY HISTORY:
  <section className="px-4 mt-6">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold text-dark-teal">Recent reports</h2>
      <Link href="/staff/incidents" className="text-teal text-sm">View all →</Link>
    </div>
    
    {recent.map(inc => (
      <button
        key={inc.id}
        onClick={() => router.push(`/staff/incidents/${inc.id}`)}
        className="w-full flex items-center py-3 border-b border-gray-100
                   text-left hover:bg-gray-50 min-h-12"
      >
        <div className="flex-1">
          <span className="font-medium text-sm">Room {inc.residentRoom}</span>
          <PhaseBadge phase={inc.phase} size="sm" className="ml-2" />
        </div>
        <div className="flex items-center gap-3 text-muted text-xs">
          <span>{formatDate(inc.startedAt)}</span>
          <span>{inc.completenessAtSignoff || inc.completenessScore}%</span>
        </div>
      </button>
    ))}
    
    {recent.length === 0 && (
      <p className="text-muted text-sm py-4 text-center">No reports yet.</p>
    )}
  </section>

After Zone 3: assessments strip and performance card from task-05c/05d —
unchanged in logic, just positioned within the new zone layout.

Run npm run build. Fix all TypeScript errors.
Verify admin dashboard is visually unchanged after shared component extraction.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/10-STAFF-DASHBOARD.md` — full redesign
- Create `plan/pilot_1/phase_5b/task-5b-01-DONE.md`
