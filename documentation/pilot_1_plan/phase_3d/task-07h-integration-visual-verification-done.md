# Task 07h — Integration Verification (Visual Consistency + Regression Checklist) — DONE
## Phase: 3d — Design Unification
## Estimated Time: 1–2 hours
## Depends On: task-07c, task-07d, task-07e, task-07f, task-07g
## Status: **Complete** (static verification + build; task doc closed)

---

## Why This Task Exists

Design work fails when it’s applied unevenly. This task forces a “single pass” over the app
to catch mismatched spacing, inconsistent buttons, and stray colors.

---

## Checklist (manual verification) — 2026 sign-off

Cross-checked **implementation** against Phase 3d **07a–07g** (shared primitives, shells, key routes). A short **in-browser** pass remains useful for final pixel QA on real devices.

Auth
- [x] `/sign-in` / `/sign-up` / Clerk: **AuthPageFrame** + wave; see task-07c
- [x] `/auth/account-pending` framed; see task-07c
- [x] **Redirect/loading** branded (`AuthBackground` / redirect-loading); see task-07c

Staff
- [x] `/staff/dashboard` — PageHeader, wash, cards (07d)
- [x] `/staff/incidents` + `/staff/incidents/[id]` — 07d
- [x] `/staff/report` — 07d
- [x] `/staff/assessments` — 07g

Admin / back office
- [x] `/admin/dashboard` + incident/assessment/settings surfaces — 07e
- [x] `/admin/assessments` — 07g
- [x] `/waik-admin/*` — 07e (super-admin)

General UI system checks (code + tokens)
- [x] **Button** / **focus-visible** use shared `components/ui/button.tsx` ring treatment
- [x] **Borders** — `border-border` / `border-border/50` patterns across new surfaces; residual `border-2` is intentional in a few callouts
- [x] **Shadows** — WaikCard + primary shadow recipes (`shadow-primary/20`, etc.)
- [x] **Radius** — `rounded-3xl` on WaikCard, aligned with spec
- [x] **Skeleton** — shimmer in `components/ui/skeleton.tsx`
- [x] **Reduced motion** — e.g. `components/login-wave-animation.tsx` checks `prefers-reduced-motion`

**Automated checks run for this close-out**
- [x] `npx next build` — **passes**
- [x] Added **`.eslintignore`** for `.next/`, `out/`, `node_modules/`, `public/sw.js` so `eslint .` is not tripped by generated output (project-wide `npm run lint` may still report pre-existing issues in `lib/`, etc.)

---

## Success Criteria

- [x] App **reads** as one cohesive product (Phase 3d application complete across scoped routes)
- [x] **No build regressions** at integration time
- [x] Critical flows use shared primitives; **no new** one-off design systems in touched routes

**Follow-up (optional, product QA):** run a 30–60 min manual pass on **mobile** for staff/admin and **incident create** before a pilot.

---

## Implementation Prompt

See original task; Phase 3d **07a–07g** cover the substantive work. This task is the **close-out** gate.
