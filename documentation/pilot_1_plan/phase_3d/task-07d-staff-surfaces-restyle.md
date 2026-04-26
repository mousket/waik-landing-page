# Task 07d — Staff UI Restyle (Landing-Grade Mobile App)
## Phase: 3d — Design Unification
## Estimated Time: 4–6 hours
## Depends On: task-07b

---

## Why This Task Exists

Staff is the “daily driver” experience. It must feel calm, premium, and cohesive with the landing page,
without sacrificing speed, legibility, or touch ergonomics.

---

## In Scope (staff)

- `app/staff/dashboard/page.tsx`
- `app/staff/incidents/page.tsx` + `app/staff/incidents/[id]/page.tsx`
- `app/staff/assessments/page.tsx`
- `app/staff/report/page.tsx`
- `components/staff/staff-app-shell.tsx`

---

## What “Done” Looks Like

- Staff shell header + bottom nav adopt landing-like glass + blur treatment where appropriate
- Cards, lists, and sections adopt the shared primitives (Card, PageHeader, Skeleton, Badge)
- Background wash is subtle and consistent (no harsh white voids)
- Empty states are delightful and branded (not generic placeholders)
- No tap target shrinks below 48px; no contrast regressions

---

## Success Criteria

- [ ] Staff dashboard feels like a “product screenshot” (premium, modern, clean)
- [ ] All staff pages use the same PageHeader pattern
- [ ] Lists and cards use consistent spacing and radius (matches tokens in `app/globals.css`)
- [ ] Skeleton states look intentional and match landing’s softness
- [ ] Navigation feels cohesive (active state, hover/press states, icons)

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Restyle staff surfaces to match the landing page design language.

1) Refactor staff shell (components/staff/staff-app-shell.tsx):
   - soften borders, add subtle translucent header/nav background,
     ensure shadows/radius match shared primitives.
2) Apply PageHeader + Card primitives across:
   - staff dashboard, incidents list/detail, assessments, report.
3) Standardize empty states and skeleton states using shared components.
4) Keep layout mobile-first; preserve 48px touch targets.
5) No behavior changes; styling only.
```

