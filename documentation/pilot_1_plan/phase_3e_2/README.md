# Phase 3e.2 — Post–Phase 3d tightening (design tokens, consistency, quality)

## Status: **COMPLETE** (2026-04-26) — See `task-09h-phase-3e-2-verification-done.md` for sign-off notes.

**UI contract:** Phase 3e.2 checklist lives under **Phase 3e.2 — UI “definition of done”** in `documentation/waik/08-COMPONENTS.md`.

## Epic overview

---

## Why this phase exists

**Phase 3d** (design unification) and **Phase 3e** (admin facility context & data alignment) are **complete** in scope. This folder tracks **intentional follow-up** work that was *deferred* or *partially* addressed:

- Remaining use of `lib/design-tokens` / `brand` where **`app/globals.css` tokens** are the long-term target
- A few **visual outliers** (e.g. offline page, heavy borders in a long incident flow)
- **CI / lint** noise and **touch-target** nits
- A written **“definition of done”** so new work does not reintroduce drift

This phase is **tightening only**: **no new product features** unless a small change is *required* for token migration on a touched file (same rule as Phase 3d).

---

## Canonical handoff (read first)

**`documentation/pilot_1_plan/phase_3e_2/phase_3e_2_task_handoff.md`**

---

## Suggested workstreams (execute in order within each track)

Cross-reference the handoff for file-level pointers. Tracked as **9x** task IDs to follow **08x** (Phase 3e).

| ID | Workstream | Est. | Task file (create when starting; rename with `-done` when finished) |
|----|------------|------|--------------------------------------|
| **09a** | **UI “definition of done”** — checklist added under Phase 3e.2 in `documentation/waik/08-COMPONENTS.md` | 0.5–1 hr | (see doc; optional `task-09a-*.md` if you track per-task files) |
| **09b** | **`/offline` page** — align with the shared wash + `WaikCard` + `Button` recipe *or* document a deliberate “dark offline” exception and remove leftover hex-only patterns | 1–2 hrs | `task-09b-offline-page-tokens.md` |
| **09c** | **Staff dashboard** — `app/staff/dashboard/page.tsx` + `components/staff/staff-dashboard-performance.tsx`: replace inline score hexes / `style={{ color: brand.* }}` with tokenized Tailwind + semantic colors | 2–4 hrs | `task-09c-staff-dashboard-tokens.md` |
| **09d** | **Admin / shared components** — incremental migration: `components/admin/*` and related bits still using `brand` / inline hex; migrate when touching, or one grep-driven pass (breadcrumb, bottom nav, dashboard tabs, etc.) | 3–6 hrs (split) | `task-09d-admin-components-tokens.md` |
| **09e** | **Incidents beta create** — soften remaining `border-2` / strong green panels in interview/review phases to match capture header styling (`app/incidents/beta/create/page.tsx`) | 1–2 hrs | `task-09e-beta-incident-create-polish.md` |
| **09f** | **48px touch targets** — audit `h-10 w-10` on critical mobile actions (e.g. `app/incidents/layout.tsx` menu) vs Phase 3d north star; adjust where safe | 1 hr | `task-09f-touch-targets-pass.md` |
| **09g** | **ESLint / CI** — `npm run typecheck` + `npm run lint:ci`; see `task-09g-eslint-ci-signal-done.md` | 1–3 hrs | `task-09g-eslint-ci-signal-done.md` |
| **09h** | **Integration sign-off** — automated gate + manual 09a checklist; see `task-09h-phase-3e-2-verification-done.md` | 0.5–1 hr | `task-09h-phase-3e-2-verification-done.md` |

**Dependency / parallelization:** **09a** first (sets the bar). **09b–09f** can run in parallel by owner after 09a. **09g** is independent. **09h** last.

---

## When a task is **done** (convention; same as Phase 3d / 3e)

1. Mark the task markdown with **Status: DONE** and date.
2. **Rename** the file to `task-09X-…-done.md` (keep slug, add `-done` before `.md`).
3. Update **this README** table or add a “Completed” section.

---

## Relationship to other phases

| Phase | What it was |
|-------|-------------|
| **3d** | Design unification (landing-grade UI across app surfaces) — **complete** |
| **3e** | Admin facility scope, APIs, nav — **complete** |
| **3e.2** (this) | Tighten loose ends and **prevent drift** before the next product epic |
| **Next** | Whatever **Phase 3f** or product backlog names (e.g. deeper Phase 3e follow-ups) — *not* defined here |

---

## One-line mission

**Make the codebase and docs match the design system as closely as the UI already does, without another full-app restyle sprint.**
