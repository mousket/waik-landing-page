# Task 07g — Assessments UI Polish (Staff + Admin) — DONE
## Phase: 3d — Design Unification
## Estimated Time: 2–4 hours
## Depends On: task-07b
## Status: **Complete** (staff + admin pages in scope; task doc closed)

---

## Why This Task Exists

Assessments are a “trust surface”: if they look rough, users assume the system is unreliable.
This task makes assessments feel cohesive, calm, and premium—consistent with the landing page.

---

## In Scope — addressed

- `app/staff/assessments/page.tsx` — `PageHeader` + wash; **WaikCard** wrapping **EmptyState** (placeholder list)
- `app/admin/assessments/page.tsx` — **WaikCard** + soft table (headers, row hover); **Skeleton** loading; **Badge** for status; **Overdue** / **Due soon** (7-day window) on next-due when applicable
- No shared cross-route assessment component was required; both routes use the same **WaikCard** / **PageHeader** / token patterns as the rest of Phase 3d

---

## What “Done” Looks Like

- One consistent “assessment card” pattern (title, due date, status chip, CTA)
- A consistent “due soon / overdue” visual language (chip + subtle accent, not loud red)
- Skeleton states that match the rest of the app (soft shimmer, correct spacing)
- Empty state that invites action (clear CTA, branded message)

---

## Success Criteria

- [x] Staff + Admin assessment pages share the same card/table recipes
- [x] Status chips are consistent with incident phase/status chips (outline **Badge** + semantic borders)
- [x] Loading/empty states look intentional and on-brand

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Polish staff and admin assessments UI to match the landing page design system.

1) Apply shared primitives (PageHeader, Card, Badge/Chip, Skeleton).
2) Standardize assessment list rows/cards and actions (start/continue/complete).
3) Implement consistent empty + loading states.
4) Keep behavior unchanged.
```
