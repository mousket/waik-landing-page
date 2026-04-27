# Task 10d — Upgrade posture & guardrails (Next 15 now, Next 16 later)

## Status: **DONE** (2026-04-26)

## Purpose

Document and lock the project’s upgrade posture so future agents don’t thrash versions:

- We are standardizing on **Next 15.x** as the “current stable major” for now.
- We document what’s required to move to **Next 16** later (and why we didn’t do it immediately).

---

## Context

- Next 16 requires newer `eslint-config-next` which expects **ESLint 9+**.
- This repo currently uses **ESLint 8**.
- Next 15 upgrade surfaced:
  - runtime provider issues (Clerk/React runtime)
  - route handler type signature changes

---

## Tasks

- [ ] In `phase_3f/README.md`, add/confirm a “Versions we pin” section:
  - `next`
  - `eslint-config-next`
  - `react`, `react-dom`
  - `@clerk/nextjs`
- [ ] Add a short “Next 16 migration prerequisites” list:
  - ESLint 9+
  - re-run route handler validators
  - re-verify Clerk auth flows
- [ ] Add “Do not upgrade via `latest` tags during stabilization” guidance (avoid surprises).

---

## Done criteria

- README contains clear upgrade guardrails and version pins.

## Outcome

- Confirmed version pins are documented in `phase_3f_readme.md` (Next 15.x, ESLint 8, React 18, Clerk).
- Added a stabilization guardrail to avoid version thrash (don’t upgrade to `latest` tags during this phase).

