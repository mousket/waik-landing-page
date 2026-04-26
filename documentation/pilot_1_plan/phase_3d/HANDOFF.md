# Phase 3d — Agent Handoff (Design Unification: Landing → Full App)

## Purpose of this handoff

This project’s **marketing landing page** is the visual standard for the entire WAiK product (staff, admin, incidents, auth). The goal of **Phase 3d** is to unify the app UI so it feels like **one designed product**, not a stitched-together set of pages.

**Phase 3d is complete (tasks 07a–07h).** For follow-up **tightening** (tokens, offline page, staff dashboard hex, admin `brand` migration, beta polish, lint), use **`documentation/pilot_1_plan/phase_3e_2/`** (`README.md` + `phase_3e_2_task_handoff.md`).

---

## What we are striving for (design north star)

### Signature look (from the landing page)

- **Typography**: Plus Jakarta for headings, Inter for body (already in `app/layout.tsx` + `app/globals.css`).
- **Color language**: **Teal primary** + **electric purple accent** + soft neutrals (tokens in `app/globals.css`).
- **Surfaces**: subtle background washes, elevated cards, soft borders, modern shadows, large radius.
- **Motion**: tasteful micro-interactions; **not** “busy” animation; must respect `prefers-reduced-motion` for ambient motion.
- **Mobile-first ergonomics**: **48px minimum touch targets** remain mandatory for staff surfaces.

### Product constraints (non-negotiable)

- **No behavior changes** unless explicitly required for UI rendering.
- Prefer **tokenized styling** over ad-hoc hex; avoid introducing new one-off color systems.
- When multiple teams/agents are working in parallel, treat the **UI spec + shared primitives** as the integration contract.

---

## Canonical references (read first)

- **UI spec + recipes**: `documentation/waik/08-COMPONENTS.md` (Phase 3d section)
- **Phase 3d epic + task list**: `documentation/pilot_1_plan/phase_3d/README.md`
- **Token source of truth**: `app/globals.css`
- **Clerk theming (auth)**: `lib/clerk-appearance.ts`
- **Auth background + wave frame**: `components/ui/auth-background.tsx` + `components/login-wave-animation.tsx`
- **Shared primitives added in 07b**:
  - `components/ui/page-header.tsx` (`PageHeader`)
  - `components/ui/empty-state.tsx` (`EmptyState`)
  - `components/ui/soft-table.tsx` (`SoftTable`)
  - `components/ui/waik-card.tsx` (`WaikCard`, `WaikCardContent`)
- **Skeleton (landing-grade shimmer)**: `components/ui/skeleton.tsx`
- **App shells updated for glass header treatment**:
  - `components/staff/staff-app-shell.tsx`
  - `components/admin/admin-app-shell.tsx`
- **Post-auth loading** now reuses the auth background aesthetic:
  - `components/ui/redirect-loading.tsx` (uses `AuthBackground` under the content)

---

## What has already been completed (high-signal)

### Documentation / planning

- `documentation/waik/08-COMPONENTS.md` now includes:
  - Phase 3d design spec
  - copy-pastable Tailwind recipes
  - mapping guidance for auth/staff/admin/incidents/assessments

- Phase 3d task files renamed to signal completion (same content, new filenames):
  - `documentation/pilot_1_plan/phase_3d/task-07a-design-audit-spec-done.md`
  - `documentation/pilot_1_plan/phase_3d/task-07b-tokens-and-primitives-done.md`
  - `documentation/pilot_1_plan/phase_3d/task-07c-auth-wave-and-login-done.md`
  - `documentation/pilot_1_plan/phase_3d/task-07d-staff-surfaces-restyle-done.md`

### 07b — Primitives + foundational styling

- Added shared UI primitives (listed above).
- Upgraded `Skeleton` to a softer, shimmer-forward treatment aligned with Phase 3d.
- Updated staff + admin shell headers to a **restrained “glass + blur + soft border”** treatment (landing-like).

### 07c — Auth + auth-adjacent experiences

- **Clerk sign-in** already used `AuthPageFrame` via `app/sign-in/[[...sign-in]]/sign-in-view.tsx` (no structural change required).
- Updated Clerk card shell styling in `lib/clerk-appearance.ts` toward landing-grade (notably `rounded-3xl` + softer border treatment).
- Wrapped additional pages in `AuthPageFrame` where it mattered:
  - `app/change-password/page.tsx`
  - `app/accept-invite/page.tsx` (moved off solid full-screen hex background)
  - `app/auth/account-pending/page.tsx`
- **Reduced motion**: `components/login-wave-animation.tsx` stops canvas animation when `prefers-reduced-motion: reduce`.
- **Post-auth / redirect loading** now uses `AuthBackground` in `components/ui/redirect-loading.tsx` for cohesive branding during transitions.

### 07d — Staff surfaces (complete)

- **Dashboard, list placeholders, report, intelligence**: `PageHeader` + background wash; **EmptyState** / **WaikCard** where appropriate; **48px** touch targets on primary actions.
- **`app/staff/incidents/[id]/page.tsx`**: canonical page wash + tab strip; all tabs use **WaikCard**-grade surfaces; Q&A/Intelligence/WAiK Agent aligned; **DocumentationScore** in `components/documentation-score.tsx` uses **WaikCard** (also consumed by admin incident detail).
- Task record: `documentation/pilot_1_plan/phase_3d/task-07d-staff-surfaces-restyle-done.md`
- **07e** admin / back office + **waik-admin**: `task-07e-admin-backoffice-restyle-done.md`
- **07f** incident create + detail alignment: `task-07f-incidents-create-and-detail-restyle-done.md`
- **07g** assessments (staff + admin): `task-07g-assessments-ui-polish-done.md`
- **07h** integration / verification: `task-07h-integration-visual-verification-done.md`

---

## What still needs to be done (in priority order)

**Phase 3d (design unification) is complete** — all tasks **07a–07h** have `task-*-done.md` records (07h: `task-07h-integration-visual-verification-done.md`). Next work is whatever **Phase 3e** / product backlog defines (see `documentation/pilot_1_plan/phase_3e/` if applicable).

---

## Architecture guidance: one incident page vs staff/admin split

Current reality in this repo: there are **separate routes** (example: `app/staff/incidents/[id]/page.tsx` and `app/admin/incidents/[id]/page.tsx`).

**Recommended direction (product + eng safety):**
- Keep **separate routes** for role boundaries (clearer security story + different workflows).
- Extract shared **layout + presentation building blocks** so both look identical in brand, even if content/actions differ by role.
- Only consider a single shared `/incidents/[id]` route if you are prepared to do rigorous server-side gating and prevent accidental UI leakage; that is a larger product/security decision.

---

## “Agent contract” to prevent drift while parallel work happens

1) **No new design system in page files.** Add UI through shared primitives or extend primitives intentionally.
2) **No hard-coded brand hex** in page code unless you have a hard Tailwind/JIT reason—prefer `bg-background`, `text-foreground`, `border-border`, `bg-primary`, `bg-accent`, `text-muted-foreground`, etc.
3) **Respect reduced motion** for ambient/background animation (see `LoginWaveAnimation` pattern).
4) **If you’re about to restyle a file that is likely being edited elsewhere**, do one of:
   - rebase/merge first, or
   - coordinate, or
   - keep changes tightly scoped to classNames + wrapper components.
5) When in doubt, follow `documentation/waik/08-COMPONENTS.md` recipes.

---

## Quick verification commands (suggested)

- `npm run build` (catches type issues after refactors)
- `npm run lint` (if configured in repo)

(Dev server is fine for local visual checks, but CI-style checks are what prevent regressions when multiple agents touch the same files.)

---

## Notes / known follow-ups (non-blocking but important)

- `components/ui/card.tsx` is still the shadcn default card (`rounded-xl`); Phase 3d often prefers **`WaikCard`** for “landing surfaces”. That’s OK—don’t mass-migrate everything unless it’s in-scope for the current task.
- `lib/design-tokens.ts` is legacy in places; long-term, routes should move toward `app/globals.css` tokens, but do not create huge churn unless 07b explicitly extends that alignment.

---

## Suggested “next session” first steps (concrete)

1) Read `documentation/waik/08-COMPONENTS.md` (Phase 3d section) + `phase_3d/README.md`.
2) **Phase 3d (07a–07h) is done.** For new UI work, follow the same primitive-first rules; pick up **Phase 3e** or the current product task from `documentation/pilot_1_plan/`.
3) Mark progress by renaming task docs to `task-…-done.md` when a slice truly finishes.

---

## If you need a one-line mission statement

**Make every WAiK screen feel as intentional as the marketing site—by enforcing one UI system, not by re-imagining each page independently.**
