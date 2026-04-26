# Phase 3b — Admin Dashboard (Command Center)
## Epic Overview
## Replaces: task-06-admin-dashboard.md (kept as historical reference)

---

## What This Phase Builds

The complete admin dashboard experience for Directors of Nursing and
Administrators. A DON opening WAiK at 7am needs to know four things in
thirty seconds: what is on fire, what needs her decision today, what is
past due, and what carries regulatory or legal risk.

This phase is split into seven subtasks because each one touches a
different part of the system. Building them separately keeps each Cursor
session focused, testable, and safe to roll back if something breaks.

---

## Architecture Map

```
Browser (Admin)
    │
    ├── app/admin/layout.tsx          ← task-06a (nav, auth guard)
    │
    ├── app/admin/dashboard/page.tsx  ← task-06b + 06c + 06d + 06e
    │       │
    │       ├── Needs Attention tab   ← task-06b (card classification)
    │       ├── Active tab            ← task-06c (48hr clock, table)
    │       └── Closed tab            ← task-06d (CSV export)
    │
    └── API Layer
            │
            ├── GET  /api/incidents?facilityId&phase&days     ← task-06a (extend)
            ├── PATCH /api/incidents/[id]/phase               ← task-06b (CREATE)
            ├── GET  /api/admin/dashboard-stats               ← task-06e (CREATE)
            └── POST /api/push/send                           ← task-06f (stub)
```

---

## Subtask Index

| Task  | What It Builds                          | Est. Time |
|-------|-----------------------------------------|-----------|
| 06a   | Layout, nav, auth guard, incident API   | 2–3 hrs   |
| 06b   | Needs Attention tab + PATCH /phase      | 3–4 hrs   |
| 06c   | Active Investigations tab + 48hr clock  | 2–3 hrs   |
| 06d   | Closed tab + CSV export                 | 1–2 hrs   |
| 06e   | Quick stats sidebar + daily brief       | 2–3 hrs   |
| 06f   | IDT overdue + push notification stub    | 2–3 hrs   |
| 06g   | Integration verification + rollup       | 1 hr      |

---

## Dependency Order

```
06a → 06b → 06c → 06d
              ↓
             06e
              ↓
             06f
              ↓
             06g
```

06a must complete first — it establishes the layout and API shape
that all other tasks depend on. After 06a, tasks 06b–06e can be run
in the order shown but not in parallel (each builds on the prior page).

---

## Key Design Decisions (read before any subtask)

**Privacy rule:** No resident names on dashboard cards. Room numbers only.
The resident name is PHI — on a shared screen or personal device it must
not appear. Full names appear only in the incident detail page.

**48hr clock anchor:** The clock measures hours elapsed since
`phaseTransitionTimestamps.phase1Signed`, not since `createdAt` or
since Phase 2 was claimed. This is the regulatory gold standard —
two hours from when the nurse signed Phase 1, not from when it was
reported. The seed data has `phase1SignedAt` which maps to this path.

**staffId is the reporter field:** On IncidentModel, `staffId` (indexed)
identifies the reporting staff member. `userId` appears in subdocuments
only (IDT team members). All incident queries filtering by reporter use
`staffId`. All other user references use the respective subdocument field.

**Role gate pattern:** Every admin page and API route checks both:
  1. `isAdminTier` — is this user an administrator/DON/head_nurse/owner?
  2. `facilityId` match — does this incident belong to their facility?
Both checks are required. One without the other is a security gap.

**Phase enum (updated in task-02/task-03e):**
  phase_1_in_progress | phase_1_complete | phase_2_in_progress | closed
