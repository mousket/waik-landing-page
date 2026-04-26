# Task 07a — Design Audit + App-Wide Spec (Landing Page Standard)
## Phase: 3d — Design Unification
## Estimated Time: 2–3 hours
## Depends On: none

---

## Why This Task Exists

If we “just start restyling screens”, we’ll drift and create three different versions of “beautiful”.
This task converts the landing page aesthetic into **explicit rules** the rest of the product can follow.

---

## Inputs (source of truth)

- Landing page sections (look/feel): `components/hero.tsx` and other landing components used by `app/page.tsx`
- Global tokens + typography: `app/globals.css`, `app/layout.tsx`
- Auth background animation frame: `components/ui/auth-background.tsx`, `components/login-wave-animation.tsx`
- Existing app shells: `components/staff/staff-app-shell.tsx`, `components/admin/admin-app-shell.tsx`

---

## Deliverables

Create a “WAiK UI spec” with concrete recipes for:
- Page layout grid (container widths, padding, vertical rhythm)
- Page headers (title/subtitle/actions)
- Cards (default, elevated, gradient accent, “info well”)
- Tables + list rows
- Form fields and inline validation
- Empty states (icon, headline, body, primary action)
- Skeletons (shimmer rules, shapes, spacing)
- Badges/chips (status, priority, phase)
- Buttons (primary/secondary/ghost/destructive) and hover motion rules
- Background washes (subtle gradients for staff/admin)
- Motion rules (hover lift, focus rings, transitions, reduced-motion constraints)

---

## Success Criteria

- [ ] A single markdown spec exists: `documentation/waik/08-COMPONENTS.md` updated or expanded with Phase 3d rules
- [ ] The spec includes copy-pastable Tailwind class recipes for the key primitives above
- [ ] The spec explicitly states which tokens to use (`--primary`, `--accent`, `--radius`, etc.)
- [ ] The spec includes “Do / Don’t” examples to prevent regressions (e.g., harsh borders, tiny touch targets)

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Audit the WAiK landing page look/feel and turn it into an app-wide design spec.
Use the landing page as the standard.

1) Identify the landing page “signature” patterns:
   - typography scale + tracking
   - gradients + background washes
   - card radius, border softness, shadows
   - button styles + hover motion
2) Create/extend documentation/waik/08-COMPONENTS.md with:
   - component recipes (Tailwind classes)
   - layout rhythm rules
   - motion + reduced-motion guidance
   - examples for tables, cards, headers, empty states, skeletons
3) Ensure the spec references app/globals.css tokens and avoids hard-coded colors unless necessary.
```

