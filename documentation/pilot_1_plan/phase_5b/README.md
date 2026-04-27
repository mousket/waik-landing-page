# Phase 5b — Staff Experience Redesign
## Epic Overview

---

## What This Phase Builds

A complete redesign of the staff-facing experience — dashboards, incident
detail, resident profiles, and report flow entry — bringing it to visual
and structural parity with the admin experience built in Phase 3b.

The design principle: **one product, two perspectives.** Staff and admin
share the same design language, the same component library, the same card
styles, the same visual hierarchy. What differs is which controls and
sections are visible, not how things look.

---

## Architecture Map

```
Staff User
    │
    ├── app/staff/dashboard/page.tsx       ← task-5b-01 (redesign)
    │       Shift header + Active Work + History
    │
    ├── app/staff/incidents/[id]/page.tsx  ← task-5b-02 (create)
    │       Incident detail — staff view (no Phase 2 controls)
    │
    ├── app/residents/[id]/page.tsx        ← task-5b-03 (unified page)
    │       One page, role-aware rendering
    │       Staff + Admin share this URL
    │
    ├── app/staff/report/page.tsx          ← task-5b-04 (entry redesign)
    │       Report flow entry — integrated with new dashboard
    │
    └── Shared UI Layer                    ← task-5b-05 (consistency pass)
            IncidentCard, Phasebadge, CompletenessRing, ShiftHeader
```

---

## Subtask Index

Completed work is tracked in companion files named `task-5b-0N-…-done.md` (same folder as this README).

| Task      | What It Builds                          | Est. Time |
|-----------|-----------------------------------------|-----------|
| 5b-01     | Staff dashboard redesign                | 3–4 hrs   |
| 5b-02     | Staff incident detail page              | 2–3 hrs   |
| 5b-03     | Unified resident profile page           | 3–4 hrs   |
| 5b-04     | Report flow entry redesign              | 1–2 hrs   |
| 5b-05     | UI consistency pass                     | 2–3 hrs   |
| 5b-06     | Integration verification + rollup       | 1 hr      |

---

## Core Design Decisions

**One resident profile URL, role-aware rendering.**
`/residents/[id]` is shared. A `RoleGate` hides MDS suggestions and
admin-only notes from staff. Everything else — interventions, incidents,
assessments, team notes — is identical for both roles.

**Visual DNA shared across roles.**
The IncidentCard component, PhaseBadge, CompletenessRing, and
ShiftHeader are extracted into shared components in `components/shared/`.
Both staff dashboard and admin dashboard import from the same source.

**Staff dashboard has three zones.**
Zone 1: Shift Header (personalized, unit-aware, ambient status indicators).
Zone 2: Active Work (in-progress incidents styled like admin's Needs Attention).
Zone 3: My History (recent reports with admin-style incident list visual language).

**staffId is the reporter field.**
All staff incident queries use `staffId: currentUser.userId`.
This was established in Phase 3c and carries through here.
