# Phase 3c — Staff Dashboard (Mobile-First Command Center)
## Epic Overview
## Replaces: task-05-staff-dashboard.md (kept as historical reference)

---

## What This Phase Builds

The complete staff dashboard experience for frontline nurses, CNAs, and
other clinical staff. The persona is a nurse who opens WAiK at 6am on
her iPhone, has thirty seconds, and needs two things: is anything urgent,
and how do I report what just happened.

This phase is split into five subtasks. Each touches a different part of
the system. Building them separately keeps each Cursor session focused,
testable, and independently verifiable.

---

## Architecture Map

```
iPhone (Staff)
    │
    ├── app/staff/layout.tsx           ← task-05a (tabs, header, auth guard)
    │
    ├── app/staff/dashboard/page.tsx   ← task-05b + 05c + 05d
    │       │
    │       ├── Hero section           ← task-05b (hero + continue banner)
    │       ├── Pending Questions      ← task-05b (pending + recent + assessments)
    │       └── Performance card       ← task-05d (streak + analytics)
    │
    └── API Layer
            │
            ├── GET /api/staff/incidents         ← task-05a (extend)
            ├── GET /api/staff/badge-counts      ← task-05a (create)
            ├── GET /api/assessments/due         ← task-05c (verify/create)
            └── GET /api/staff/performance       ← task-05d (create)
```

---

## Subtask Index

| Task  | What It Builds                          | Est. Time |
|-------|-----------------------------------------|-----------|
| 05a   | Layout, tabs, auth guard, API contract  | 2–3 hrs   |
| 05b   | Hero + Pending Questions + Recent       | 2–3 hrs   |
| 05c   | Assessments strip + skeleton states     | 1–2 hrs   |
| 05d   | Performance card + streak analytics     | 2–3 hrs   |
| 05e   | Integration verification + rollup       | 1 hr      |

---

## Dependency Order

```
05a → 05b → 05c → 05d → 05e
```

05a locks the API contracts and layout. Every subsequent task depends on it.

---

## Key Design Decisions (read before any subtask)

**staffId is the canonical reporter field.**
On IncidentModel, `staffId` identifies the staff member who filed the
report. It is indexed. All queries filtering "my incidents" use:
  `{ staffId: currentUser.userId, facilityId: currentUser.facilityId }`
Never use `userId` for this purpose — `userId` appears only in
subdocuments (IDT team members).

**Pending questions definition (authoritative rule):**
An incident appears in the Pending Questions section when ALL of:
  1. `staffId === currentUser.userId` (this nurse's report)
  2. `phase === "phase_1_in_progress"` (still in progress)
  3. The incident has unanswered Tier 2 questions OR unanswered
     closing questions
  
  "Unanswered" means: `questionsAnswered < tier2QuestionsGenerated`
  OR the closing questions array has unanswered entries.
  
  For the dashboard, use: `completenessScore < 100` as a practical proxy
  (avoids counting individual question fields which may not be consistent
  across incident types in the current model).

**Pending questions sort: oldest first.**
The incident started longest ago is the most overdue. Sort by
`startedAt` ascending (earliest at top).

**Performance analytics source of truth:**
Streak and monthly averages are computed from the nurse's closed incidents
(phase_1_complete or closed, completenessAtSignoff > 0). They are computed
server-side in a dedicated `/api/staff/performance` endpoint and cached
in Redis for 10 minutes. Client-side computation from tab data is NOT used
— it would be partial (tabs show filtered subsets).

**Tab badge polling pattern:**
Badge counts (pending questions, due assessments) are fetched from a
single `/api/staff/badge-counts` endpoint and polled every 60 seconds
from the layout component. This avoids per-section polling and reduces
battery drain. The same counts are used across Home and Incidents tabs
(they show the same number).

**Mobile-first, 48px minimum touch targets:**
Every interactive element (buttons, tab items, list rows) must be
minimum 48px in height. This is not aesthetic — it is an accessibility
and usability requirement for gloved hands and tired fingers at 6am.

**Unit selection modal:**
On first load of the day, if the facility has configured units AND the
nurse has not selected a unit for today, a modal appears before the
dashboard renders. This was specified by Scott in the flowchart review.
The unit is stored in `localStorage` with a date key. Selected unit is
passed as an optional filter parameter to incident queries.
