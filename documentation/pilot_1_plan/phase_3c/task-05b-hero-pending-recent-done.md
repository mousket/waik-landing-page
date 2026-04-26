# Task 05b — Hero Section + Pending Questions + Recent Reports
## Phase: 3c — Staff Dashboard
## Estimated Time: 2–3 hours
## Depends On: task-05a (layout + API contracts complete)

---

## Why This Task Exists

These three sections are the core of the staff dashboard — the reason a
nurse opens WAiK at all. They must load fast, be instantly scannable on
a small screen, and never require more than one tap to take action.

**Section 1 — Hero.** The Report Incident button is the most important
element on the entire screen. It must be visible without scrolling on
the smallest common screen (375px — iPhone SE). Everything else on the
dashboard is secondary to this button existing and being tappable.

The amber "continue" banner that appears when a nurse has an unfinished
report is equally important — it is the system saying "you started
something, please finish it." This is WAiK's version of a gentle nudge.
It must appear above the Report Incident button, never obscure it.

**Section 2 — Pending Questions.** This section answers: "What is WAiK
waiting on from me right now?" Each card is a specific incident where
the nurse has unanswered questions. The question count badge, the
completion ring, and the "Continue Report" button are all in service
of one goal: get the nurse back into the report she left.

**Design pattern: Client-side pending question detection.**
The API returns all staff incidents. The pending question filtering
(`phase_1_in_progress AND completenessScore < 100`) happens client-side
using the same data. This avoids a second API call and keeps the data
consistent — the same incident object drives both the pending card and
the recent report row.

**Section 3 — Recent Reports.** The compact list of the nurse's last five
incidents. Phase color dots give immediate visual feedback on where each
incident stands in the workflow. A nurse who filed an incident yesterday
and wonders if the investigation is complete can see the blue dot and
know Phase 2 is in progress — without navigating anywhere.

---

## Context Files

- `app/staff/dashboard/page.tsx` — primary build target
- `lib/types/staff-incident-summary.ts` — from task-05a
- `app/api/staff/incidents/route.ts` — from task-05a
- `components/ui/completion-ring.tsx` — CREATE THIS (reused in multiple places)
- `lib/utils/pending-question-utils.ts` — CREATE THIS

---

## Pending Question Utility (pure functions)

```typescript
// lib/utils/pending-question-utils.ts

import { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"

export function hasPendingQuestions(incident: StaffIncidentSummary): boolean {
  return (
    incident.phase === "phase_1_in_progress" &&
    incident.completenessScore < 100
  )
}

export function getPendingQuestionCount(incident: StaffIncidentSummary): number {
  // Questions remaining = generated - answered
  // Use 1 as minimum to avoid showing "0 questions remaining" on in-progress
  const remaining = Math.max(
    1,
    incident.tier2QuestionsGenerated - incident.questionsAnswered
  )
  return remaining
}

export function hasUnfinishedReport(incident: StaffIncidentSummary): boolean {
  // Unfinished = Phase 1 in progress (nurse actively working it)
  return incident.phase === "phase_1_in_progress"
}

export function getPhaseDotColor(phase: StaffIncidentSummary["phase"]): string {
  switch (phase) {
    case "phase_1_in_progress": return "#E8A838"  // amber
    case "phase_1_complete":    return "#F4D03F"  // yellow
    case "phase_2_in_progress": return "#2E86DE"  // blue
    case "closed":              return "#0D7377"  // teal
    default:                    return "#9CA3AF"  // gray
  }
}
```

---

## CompletionRing Component

```typescript
// components/ui/completion-ring.tsx
// Reusable circular progress ring — used in pending cards, active investigations, report card

interface CompletionRingProps {
  percent: number    // 0-100
  size?: number      // diameter in px, default 40
  strokeWidth?: number  // default 3
  showLabel?: boolean   // show percentage text inside, default true
  colorOverride?: string // override teal default
}
```

SVG-based. No external library. Stroke color: teal (#0D7377) by default.
Track color: #E0E0E0. Text inside: percent%, font-size scales with size prop.

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] hasPendingQuestions() unit tests pass
- [ ] getPendingQuestionCount() unit tests pass
- [ ] getPhaseDotColor() returns correct color for all four phases
- [ ] CompletionRing renders at default 40px with correct fill percentage
- [ ] Report Incident button visible without scrolling on 375px viewport (iPhone SE)
- [ ] Amber "continue" banner appears when phase_1_in_progress incident exists for current user
- [ ] Banner links to /staff/incidents/[that-incident-id]
- [ ] Pending Questions section visible when count > 0
- [ ] Pending Questions section hidden and replaced with green empty state when count = 0
- [ ] Pending cards sorted oldest startedAt first
- [ ] Each card shows: residentRoom, incidentType, time elapsed, question count badge, completion ring, Continue Report button
- [ ] "Continue Report" navigates to /staff/incidents/[id]
- [ ] Recent Reports shows last 5 incidents sorted by startedAt descending
- [ ] Each row shows: residentRoom, incidentType badge, formatted date, phase dot, completeness %
- [ ] Phase dot colors match design tokens
- [ ] Tapping a recent report row navigates to /staff/incidents/[id]
- [ ] "View all" link navigates to /staff/incidents
- [ ] Loading skeletons show for both sections while data fetches

---

## Test Cases

```
TEST 1 — hasPendingQuestions utility
  Action: hasPendingQuestions({ phase: "phase_1_in_progress", completenessScore: 88 })
  Expected: true
  Action: hasPendingQuestions({ phase: "phase_1_complete", completenessScore: 82 })
  Expected: false
  Action: hasPendingQuestions({ phase: "phase_1_in_progress", completenessScore: 100 })
  Expected: false
  Pass/Fail: ___

TEST 2 — getPendingQuestionCount utility
  Action: getPendingQuestionCount({ tier2QuestionsGenerated: 6, questionsAnswered: 5 })
  Expected: 1
  Action: getPendingQuestionCount({ tier2QuestionsGenerated: 0, questionsAnswered: 0 })
  Expected: 1 (minimum 1 to avoid "0 questions remaining")
  Pass/Fail: ___

TEST 3 — Report Incident visible without scroll on 375px
  Action: Load /staff/dashboard at 375px width
  Expected: "Report Incident" button fully visible in viewport,
            no scrolling needed
  Pass/Fail: ___

TEST 4 — Amber banner for Maria (INC-003 in progress)
  Action: Sign in as m.torres@sunrisemn.com, load dashboard
  Expected: Amber banner visible above hero card:
            "You have an unfinished report. Tap to continue."
            Links to /staff/incidents/inc-003
  Pass/Fail: ___

TEST 5 — Pending Questions card for Maria
  Action: Sign in as m.torres@sunrisemn.com, load dashboard
  Expected: Pending Questions section shows INC-003
            Room 515, Fall, "1 question remaining", 88% ring, Continue button
  Pass/Fail: ___

TEST 6 — Empty state when no pending questions
  Action: Sign in as p.walsh@sunrisemn.com (admin — no incidents as reporter)
          Or sign in as user with all incidents complete
  Expected: Green "No pending questions — you are all caught up." card visible
  Pass/Fail: ___

TEST 7 — Pending cards sorted oldest first
  Action: Linda Osei (INC-001 started 5hr ago)
          vs DeShawn Carter (INC-002 started 3hr ago)
          Each sees only their own incident — test sorting with multiple
          incidents for a single user if seed data allows
  Expected: Oldest incident appears first
  Pass/Fail: ___

TEST 8 — Recent Reports for Maria shows correct 5 incidents
  Action: Sign in as m.torres@sunrisemn.com
  Expected: INC-003 (today, amber dot), INC-004 (yesterday, amber dot),
            INC-006 (blue dot), INC-007 (blue dot), INC-009 (teal dot)
  Pass/Fail: ___

TEST 9 — Phase dots correct colors
  Action: Inspect recent reports list
  Expected: phase_1_in_progress → amber (#E8A838)
            phase_2_in_progress → blue (#2E86DE)
            closed → teal (#0D7377)
  Pass/Fail: ___

TEST 10 — Tapping recent report row navigates
  Action: Tap INC-009 row
  Expected: Navigate to /staff/incidents/inc-009
  Pass/Fail: ___

TEST 11 — Loading skeletons appear
  Action: Throttle to Slow 3G in DevTools, load dashboard
  Expected: Skeleton cards visible for both Pending Questions
            and Recent Reports before real data loads
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building the staff dashboard for WAiK (Next.js 14). This task builds
the hero section, pending questions, and recent reports. The API and layout
are done in task-05a.

PART A — CREATE lib/utils/pending-question-utils.ts

Create the file exactly as specified in the task-05b spec. Export:
  hasPendingQuestions(incident: StaffIncidentSummary): boolean
  getPendingQuestionCount(incident: StaffIncidentSummary): number
  hasUnfinishedReport(incident: StaffIncidentSummary): boolean
  getPhaseDotColor(phase: string): string

Write unit tests in __tests__/pending-question-utils.test.ts:
  hasPendingQuestions: in_progress + score<100 → true
  hasPendingQuestions: complete → false
  hasPendingQuestions: in_progress + score=100 → false
  getPendingQuestionCount: 6 generated - 5 answered → 1
  getPendingQuestionCount: 0 generated → 1 (minimum)
  getPhaseDotColor: all four phases return correct hex

PART B — CREATE components/ui/completion-ring.tsx

SVG-based circular progress. No external library.

const RADIUS = (size - strokeWidth) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const dashOffset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE

<svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
  {/* Track */}
  <circle cx={size/2} cy={size/2} r={RADIUS}
    fill="none" stroke="#E0E0E0" strokeWidth={strokeWidth} />
  {/* Progress */}
  <circle cx={size/2} cy={size/2} r={RADIUS}
    fill="none" stroke={colorOverride ?? "#0D7377"} strokeWidth={strokeWidth}
    strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
    strokeLinecap="round" />
</svg>
{showLabel && (
  <span style={{ position: "absolute", fontSize: size * 0.28, fontWeight: 600, color: "#1E2B2C" }}>
    {percent}%
  </span>
)}

Wrap in a relative div with flex-center for label positioning.

PART C — BUILD app/staff/dashboard/page.tsx

This is a "use client" component. It fetches its own data.

DATA FETCHING:
  const [incidents, setIncidents] = useState<StaffIncidentSummary[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/staff/incidents")
      if (res.ok) {
        const data = await res.json()
        setIncidents(data.incidents)
      }
      setLoading(false)
    }
    load()
  }, [])
  
  // Derive sections from incidents (no second fetch)
  const unfinished = incidents.find(hasUnfinishedReport)
  const pendingIncidents = incidents
    .filter(hasPendingQuestions)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
  
  const recentIncidents = [...incidents]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5)

SECTION 1 — HERO ACTION CARD:
  Full-width teal card, border-radius 16px, margin: 16px, padding: 20px
  
  If unfinished exists:
    AMBER BANNER above hero card:
      bg-warn, border-l-4 border-accent, rounded-xl, p-3, mb-3
      "You have an unfinished report — tap to continue."
      Make entire banner a link to /staff/incidents/[unfinished.id]
  
  Inside hero card:
    Button full-width: "🎤  Report Incident"
      bg-white text-teal font-bold text-lg rounded-xl py-4
      onClick: router.push("/staff/report")
    Subtitle: "Start a voice report in under 10 minutes"
      text-white opacity-75 text-sm text-center mt-2

SECTION 2 — PENDING QUESTIONS:
  Container: px-4
  
  If loading: show 2 skeleton cards (shadcn <Skeleton />, same height as real cards)
  
  If !loading && pendingIncidents.length === 0:
    GREEN EMPTY STATE:
      bg-green-50, border-l-4 border-green-500, rounded-xl, p-4
      "✓  No pending questions — you are all caught up."
  
  If pendingIncidents.length > 0:
    Heading row: flex justify-between items-center, mb-3
      "Questions waiting for you" (font-semibold, text-dark-teal)
      Red badge: pendingIncidents.length
    
    For each pending incident:
      PENDING CARD (white, border-l-4 border-accent, rounded-xl, p-4, mb-3):
        Row 1: "Room [residentRoom]" (font-semibold) + incident type badge (teal pill)
        Row 2: time elapsed (date-fns formatDistanceToNow(startedAt, { addSuffix: true }))
               in muted text + red badge "[N] question(s) remaining"
               where N = getPendingQuestionCount(incident)
        Row 3: CompletionRing (40px, incident.completenessScore)
               + "Continue Report" button → /staff/incidents/[id]
               Button: bg-teal text-white text-sm px-4 py-2 rounded-lg, min-h-12

SECTION 3 — RECENT REPORTS:
  Container: px-4, mt-6
  
  If loading: show 3 skeleton rows (height 40px each)
  
  Heading row: flex justify-between
    "Your reports" (font-semibold, text-dark-teal)
    "View all →" link → /staff/incidents (text-teal, text-sm)
  
  For each of recentIncidents (max 5):
    REPORT ROW (flex items-center, py-3, border-b border-gray-100, min-h-12):
      Left: flex-col
        "Room [residentRoom]" font-medium text-sm
        Incident type badge (small teal pill)
      Center: flex-1 text-center
        Date: if today → "Today", else format(date, "MMM d")
        Muted text-xs
      Right: flex items-center gap-2
        Phase dot: 8px circle, fill = getPhaseDotColor(incident.phase)
        Completeness: incident.completenessAtSignoff + "%" muted text-xs
    
    Entire row is tappable: onClick → router.push(/staff/incidents/[id])
    cursor-pointer, hover:bg-gray-50

ALL MINIMUM TOUCH TARGETS: every interactive element min height 48px.
Import formatDistanceToNow from "date-fns".

Run npm run build. Fix all TypeScript errors.
Do not add performance card — that is task-05d.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/10-STAFF-DASHBOARD.md` — hero + pending + recent
- Create `plan/pilot_1/phase_3c/task-05b-DONE.md`

