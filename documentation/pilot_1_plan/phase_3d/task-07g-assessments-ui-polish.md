# Task 07g — Assessments UI Polish (Staff + Admin)
## Phase: 3d — Design Unification
## Estimated Time: 2–4 hours
## Depends On: task-07b

---

## Why This Task Exists

Assessments are a “trust surface”: if they look rough, users assume the system is unreliable.
This task makes assessments feel cohesive, calm, and premium—consistent with the landing page.

---

## In Scope

- `app/staff/assessments/page.tsx`
- `app/admin/assessments/page.tsx`
- Any shared assessment components used by both pages
- Skeleton states and empty states for assessments lists/detail panes (if applicable)

---

## What “Done” Looks Like

- One consistent “assessment card” pattern (title, due date, status chip, CTA)
- A consistent “due soon / overdue” visual language (chip + subtle accent, not loud red)
- Skeleton states that match the rest of the app (soft shimmer, correct spacing)
- Empty state that invites action (clear CTA, branded message)

---

## Success Criteria

- [ ] Staff + Admin assessment pages share the same card/table recipes
- [ ] Status chips are consistent with incident phase/status chips
- [ ] Loading/empty states look intentional and on-brand

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

