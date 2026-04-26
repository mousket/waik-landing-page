# Task 07b — Tokens + Primitives Alignment (Make “Beautiful” Reusable)
## Phase: 3d — Design Unification
## Estimated Time: 3–5 hours
## Depends On: task-07a

---

## Why This Task Exists

The app currently mixes:
- global CSS tokens in `app/globals.css` (landing-page-ready)
- a parallel palette in `lib/design-tokens.ts` (staff/admin shell legacy)
- per-component one-off classes

This task makes the “landing grade” UI **repeatable** by standardizing primitives and removing drift.

---

## What This Task Builds

Shared primitives that every surface uses:
- Page container + section spacing utilities
- Card primitives (base/elevated/accent)
- Table primitives (header, row hover, zebra, sticky header options)
- Page header component (title/subtitle/actions)
- Empty state component
- Skeleton primitives (shimmer + shapes)
- Badge/chip primitives (status + severity)

---

## Target Files (likely touched)

- `app/globals.css` (tokens only; avoid bespoke per-page CSS)
- `lib/design-tokens.ts` (either align to CSS tokens or deprecate usage gradually)
- `components/ui/*` (cards, skeletons, badges, table wrappers)
- `components/admin/*` and `components/staff/*` (replace ad-hoc styling with primitives)

---

## Success Criteria

- [ ] All new primitives live under `components/ui/` and are used by at least staff + admin surfaces
- [ ] No new hard-coded colors are introduced unless explicitly justified
- [ ] Surfaces visually match landing page: soft borders, modern shadows, consistent radius, refined hover motion
- [ ] Reduced motion works (no essential UI relies on animation)

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Implement the Phase 3d primitives from the spec (task-07a).

1) Create/standardize UI primitives in components/ui:
   - PageHeader
   - Card variants (base/elevated/accent)
   - EmptyState
   - Table wrapper styles
   - Skeleton primitives (ensure consistent shimmer)
   - Badge/Chip variants for status/severity
2) Ensure tokens come from app/globals.css (primary/accent/radius/border/ring).
3) Refactor staff-app-shell and admin-app-shell to use the shared header styles
   (glass/blur, border softness, consistent height/spacing).
4) Keep behavior unchanged; styling only.
```

