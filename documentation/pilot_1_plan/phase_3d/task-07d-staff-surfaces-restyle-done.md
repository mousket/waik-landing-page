# Task 07d — Staff UI Restyle (Landing-Grade Mobile App) — DONE
## Phase: 3d — Design Unification
## Estimated Time: 4–6 hours
## Depends On: task-07b
## Status: **Complete** (staff surfaces in scope are landing-grade; task doc closed)

---

## Why This Task Exists

Staff is the “daily driver” experience. It must feel calm, premium, and cohesive with the landing page,
without sacrificing speed, legibility, or touch ergonomics.

---

## In Scope (staff) — all addressed

- `app/staff/dashboard/page.tsx`
- `app/staff/incidents/page.tsx` + `app/staff/incidents/[id]/page.tsx`
- `app/staff/assessments/page.tsx`
- `app/staff/report/page.tsx`
- `app/staff/intelligence/page.tsx` (same shell pattern; listed explicitly for traceability)
- `components/staff/staff-app-shell.tsx` (glass header + bottom nav; aligned in 07b+)
- `components/documentation-score.tsx` (used on staff incident detail Overview; **WaikCard** + token styling)

---

## What “Done” Looks Like (verified)

- Staff shell header + bottom nav: glass + blur treatment (see `staff-app-shell.tsx`).
- Shared primitives: **PageHeader**, **EmptyState**, **WaikCard** / **WaikCardContent**, **Skeleton** where applicable.
- **Background wash**: `from-primary/5 via-background to-accent/5` (or equivalent) on staff list/placeholder pages and incident detail frame.
- Empty states: branded, not generic; incident list includes primary actions with **min-h-[48px]**.
- **Touch**: primary actions and key controls at **48px** minimum; incident detail Q&A/Intelligence tuned for staff.
- **Staff incident detail**: multi-tab UI migrated to **WaikCard**; tabs use token primary active state; **DocumentationScore** restyled in shared component.

---

## Success Criteria

- [x] Staff dashboard feels like a “product screenshot” (premium, modern, clean)
- [x] Staff major pages use the same **PageHeader** + wash pattern (dashboard, incidents list, assessments, report, intelligence)
- [x] Lists and cards use consistent spacing and radius (tokens in `app/globals.css`; **WaikCard** on incident detail and report flows)
- [x] Skeleton states align with 07b shimmer (dashboard loading paths)
- [x] Navigation feels cohesive (shell + active states; incident detail tab strip)

---

## Completion notes (for handoff)

- **`app/staff/incidents/[id]/page.tsx`**: large page; work was done in chunks (chrome + Overview + Q&A + Intelligence + WAiK Agent tabs, shared documentation score).
- **Phase 3d overall**: **07d is only the staff vertical.** **07e–07h** (admin, incident create routes, assessments polish, integration verification) remain for the full epic.

---

## Original implementation prompt (historical)

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
