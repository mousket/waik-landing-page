# Task 06c — Active Investigations Tab + 48-Hour Clock
## Phase: 3b — Admin Dashboard
## Estimated Time: 2–3 hours
## Depends On: task-06b (Needs Attention tab complete)

---

## Why This Task Exists

The Active Investigations tab shows every incident currently in Phase 2.
Its central feature is the 48-hour clock — a regulatory gold standard
that measures time elapsed since Phase 1 was signed.

**The clock is the most important visual element on this tab.** A DON
scanning 6 active investigations needs to know immediately which ones are
about to breach the 48-hour window. Color coding does this at a glance
without requiring mental arithmetic.

**Design pattern: Derived state computed at render time.**
The hours-remaining value is not stored in the database — it is computed
from `phase1SignedAt` every time the component renders. This is correct.
Storing computed values creates consistency problems when data changes.
The rule: store facts (timestamps), compute derived values (hours elapsed,
clock color) in the UI layer.

**Infrastructure: Real-time vs polling.**
The clock counts down. Should it update every second? No — that creates
unnecessary re-renders and battery drain on mobile devices. The practical
approach: the table re-fetches every 60 seconds (same polling interval as
notification badges). The clock values update on each re-fetch. Between
fetches the clock shows the value from the last fetch. For investigations
measured in hours, one-minute precision is sufficient.

**Why sort by most critical first:**
The DON has limited attention. Sorting by ascending `hoursRemaining`
(most urgent at top) means the highest-risk investigations are always
visible without scrolling. This is intentional and must not be overridden
by a default date sort.

---

## Context Files

- `app/admin/dashboard/page.tsx` — add Active Investigations tab content
- `lib/utils/incident-classification.ts` — add clock utility here
- `lib/types/incident-summary.ts` — from task-06a
- `app/api/incidents/route.ts` — use existing with phase filter

---

## Clock Utility (add to incident-classification.ts)

```typescript
export type ClockStatus = "gray" | "amber" | "red" | "overdue"

export interface ClockState {
  hoursRemaining: number
  status: ClockStatus
  label: string        // "28h remaining", "Overdue by 3h", etc.
}

export function computeClock(
  phase1SignedAt: string | null,
  goldStandardHours: number = 48,
  nowMs: number = Date.now()
): ClockState | null {
  if (!phase1SignedAt) return null

  const signedMs = new Date(phase1SignedAt).getTime()
  const elapsedHours = (nowMs - signedMs) / (1000 * 60 * 60)
  const hoursRemaining = goldStandardHours - elapsedHours

  if (hoursRemaining <= 0) {
    const overdueHours = Math.abs(hoursRemaining)
    return {
      hoursRemaining,
      status: "overdue",
      label: `Overdue by ${Math.floor(overdueHours)}h`
    }
  }

  const h = Math.floor(hoursRemaining)
  const label = `${h}h remaining`

  if (hoursRemaining < 6)  return { hoursRemaining, status: "red",   label }
  if (hoursRemaining < 24) return { hoursRemaining, status: "amber", label }
  return                          { hoursRemaining, status: "gray",  label }
}
```

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] computeClock() unit tests pass (see test cases)
- [ ] Active Investigations tab shows all phase_2_in_progress incidents
- [ ] Table shows columns: Room | Type | Phase | Completeness | 48hr Clock | View
- [ ] 48hr clock column shows correct label for each seed incident
- [ ] INC-006 shows amber clock (~28h remaining)
- [ ] INC-007 shows red clock (~5h remaining)
- [ ] INC-008 shows gray clock (~44h remaining)
- [ ] Table sorted by hoursRemaining ascending (most urgent first)
- [ ] Clock colors: gray > 24h, amber 6-24h, red < 6h, red bold for overdue
- [ ] "View" button navigates to /admin/incidents/[id]
- [ ] Filter row: All | Phase 1 In Progress | Phase 1 Complete | Phase 2 In Progress
- [ ] Sort select: Date | Completeness | Hours Remaining
- [ ] Completeness shown as circular ring with percentage
- [ ] Count badge on Active tab shows correct number
- [ ] Loading skeletons while fetching
- [ ] Mobile: card stack instead of table

---

## Test Cases

```
TEST 1 — computeClock: 20hr elapsed → amber
  Action: computeClock(phase1SignedAt_20hrs_ago)
  Expected: { status: "amber", hoursRemaining: ~28, label: "28h remaining" }
  Pass/Fail: ___

TEST 2 — computeClock: 43hr elapsed → red
  Action: computeClock(phase1SignedAt_43hrs_ago)
  Expected: { status: "red", hoursRemaining: ~5, label: "5h remaining" }
  Pass/Fail: ___

TEST 3 — computeClock: 4hr elapsed → gray
  Action: computeClock(phase1SignedAt_4hrs_ago)
  Expected: { status: "gray", hoursRemaining: ~44, label: "44h remaining" }
  Pass/Fail: ___

TEST 4 — computeClock: 50hr elapsed → overdue
  Action: computeClock(phase1SignedAt_50hrs_ago)
  Expected: { status: "overdue", label: "Overdue by 2h" }
  Pass/Fail: ___

TEST 5 — computeClock: null phase1SignedAt → null
  Action: computeClock(null)
  Expected: null returned (no clock rendered)
  Pass/Fail: ___

TEST 6 — Active tab shows seed incidents
  Action: Sign in as DON, load /admin/dashboard, click Active tab
  Expected: INC-006 (Room 204), INC-007 (Room 306), INC-008 (Room 411) visible
  Pass/Fail: ___

TEST 7 — Clock colors correct on seed data
  Action: View Active tab
  Expected: INC-006 row: amber clock "28h remaining"
            INC-007 row: red clock "5h remaining"
            INC-008 row: gray clock "44h remaining"
  Pass/Fail: ___

TEST 8 — Table sorted most urgent first
  Action: Load Active tab without changing sort
  Expected: INC-007 (5h remaining) appears first
            INC-006 (28h remaining) appears second
            INC-008 (44h remaining) appears last
  Pass/Fail: ___

TEST 9 — View button navigates correctly
  Action: Click View on INC-006
  Expected: Navigate to /admin/incidents/inc-006
  Pass/Fail: ___

TEST 10 — Mobile renders card stack
  Action: Load Active tab at 375px width
  Expected: Card stack visible (not table)
            Clock label visible on each card
  Pass/Fail: ___

TEST 11 — Filter works
  Action: Select "Phase 2 In Progress" from filter
  Expected: Only phase_2_in_progress incidents shown
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task adds the Active Investigations
tab to the admin dashboard with the 48-hour countdown clock system.

PART A — ADD computeClock TO lib/utils/incident-classification.ts

Add the ClockStatus type, ClockState interface, and computeClock function
exactly as specified in the task-06c spec. Do not remove the existing
classifyIncident or isIdtOverdue functions.

Add unit tests to __tests__/incident-classification.test.ts:
  - 20hr elapsed → amber, ~28h remaining
  - 43hr elapsed → red, ~5h remaining
  - 4hr elapsed → gray, ~44h remaining
  - 50hr elapsed → overdue, "Overdue by 2h"
  - null phase1SignedAt → null
  - computeClock with custom goldStandardHours=24 — verify thresholds scale

PART B — ACTIVE INVESTIGATIONS TAB DATA

In app/admin/dashboard/page.tsx, add the Active tab section.

Fetch on mount and every 60 seconds (use SWR or useEffect + setInterval):
  GET /api/incidents?phase=phase_2_in_progress
  
Process response:
  const withClock = incidents.map(inc => ({
    ...inc,
    clock: computeClock(inc.phase1SignedAt)
  }))
  
  // Sort: most urgent first (lowest hoursRemaining at top)
  // Overdue incidents (hoursRemaining < 0) sort to very top
  const sorted = withClock.sort((a, b) => {
    const aH = a.clock?.hoursRemaining ?? Infinity
    const bH = b.clock?.hoursRemaining ?? Infinity
    return aH - bH
  })

PART C — ACTIVE INVESTIGATIONS TABLE (desktop)

Table with these columns:

Room | Type | Phase Badge | Completeness | 48hr Clock | View

ROW RENDERING:
  Room: residentRoom (bold, teal)
  Type: incidentType formatted as display label:
    "fall" → "Fall"
    "medication_error" → "Medication Error"
    "resident_conflict" → "Resident Conflict"
    "wound_injury" → "Wound / Injury"
    "abuse_neglect" → "Abuse / Neglect"
  
  Phase Badge:
    phase_1_in_progress → amber pill "Phase 1 Active"
    phase_1_complete → yellow pill "Phase 1 Complete"
    phase_2_in_progress → blue pill "Phase 2 Active"
  
  Completeness: circular ring component
    40px diameter SVG circle
    Stroke: teal (#0D7377)
    Percentage text inside: "[X]%"
    Data: incident.completenessAtSignoff (0 if null)
  
  48hr Clock:
    If clock is null: "—" in muted gray
    If clock.status === "gray":   gray text, normal weight
    If clock.status === "amber":  amber (#E8A838) text, font-medium
    If clock.status === "red":    red (#C0392B) text, font-bold
    If clock.status === "overdue": red text, font-bold, italic
  
  View: small teal button → /admin/incidents/[id]

TABLE CONTROLS (above table):
  Left: filter pills (All | Phase 1 In Progress | Phase 1 Complete | Phase 2)
    Clicking filter: re-filter the sorted array client-side (no new API call)
  Right: sort select (Date ↓ | Completeness ↓ | Hours Remaining ↑)
    Sort applied client-side to the current filtered array

PART D — CARD STACK (mobile, < 768px)

When screen width < 768px: show card stack instead of table.
Each card (white, rounded-xl, border, p-4, mb-3):
  Row 1: "Room [X] — [Type]" (font-semibold) + Phase Badge
  Row 2: Completeness ring (32px) + "[X]% complete" label
  Row 3: Clock label in correct color
  Row 4: Full-width "View" button

PART E — COUNT BADGE

Count on the "Active Investigations" tab:
  = total phase_2_in_progress incidents (before filter)
  Update when data re-fetches

PART F — LOADING SKELETON

While fetching: show 3 skeleton rows (same height as real rows).
Use shadcn <Skeleton /> with gray shimmer animation.

Run npm run build. Fix all TypeScript errors.
Do not modify the Needs Attention tab from task-06b.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/11-ADMIN-DASHBOARD.md` — Active tab + clock
- Create `plan/pilot_1/phase_3b/task-06c-DONE.md`
