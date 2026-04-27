# Phase 3f — Next 15 stabilization & route-by-route hardening

## Status: **10a + 10b complete** (2026-04-26) — 10c route sweep and 10d final sign-off may still be run manually

Phase 3f exists because upgrading to **Next.js 15** surfaced **runtime** crashes + **typecheck** failures (App Router route handler typing changes) that block further work.

This phase is **not a redesign**. It is stability + correctness so design work can continue safely.

---

## Goal

1. Admin/staff/public routes load without red error overlays (Clerk + React runtime stable).
2. `npm run typecheck` passes on Next 15 (route handlers updated to the new signature).
3. Route-by-route smoke sweep catches remaining runtime/hydration regressions and documents them.

---

## Current state (what is true right now)

- Repo is on **Next.js 15.5.15** (`package.json`), React **18.2.0**, Clerk `@clerk/nextjs` **6.39.1**.
- **Previously observed in dev** (mitigated; re-verify on `/admin/dashboard` after `rm -rf .next`):
  - `Cannot read properties of undefined (reading 'call')` near `ClerkProvider` / root layout
  - `Cannot read properties of undefined (reading 'ReactCurrentDispatcher')` with stack near `components/conditional-root-header.tsx`
- Client boundary: `components/clerk-root-provider.tsx` + **`components/root-clerk-header.tsx`** (Clerk `SignedIn` / `SignedOut` / `UserButton` + `ConditionalRootHeader` in one client tree).
- `npm run typecheck` is **passing** after migrating dynamic route handlers to `NextRequest` + `context.params: Promise<...>`.
- `ClerkRootProvider` uses the shared `ClerkAppearance` type from `@/lib/clerk-appearance` (not `unknown`).
- Dev-only hardening: `PwaProviders` unregisters any previously-registered Service Worker + clears Cache Storage on localhost to avoid stale `_next/static` precache 404s after upgrades.
- Hydration hardening was introduced for time-based strings:
  - `hooks/use-hydration-safe-relative-time.ts`
  - Used in `components/admin/needs-attention-tab.tsx` and `components/admin/stats-sidebar.tsx`
  - Greeting/localStorage reads were deferred to effects in `components/admin/daily-brief.tsx`

---

## Task index (execute in this order)

| Order | ID | Task | Output |
|------:|----|------|--------|
| 1 | **10a** | **Stabilize Clerk + React runtime** on Next 15 (remove dev overlay crashes) | Admin dashboard loads in dev; no runtime TypeErrors |
| 2 | **10b** | **Fix TypeScript route handler signatures** for Next 15 (`context.params` Promise typing) | `npm run typecheck` passes |
| 3 | **10c** | **Route-by-route smoke sweep** (public → staff → admin → super admin) with a written checklist + findings | short QA log in task file + follow-ups |
| 4 | **10d** | **Lock upgrade posture** (document why we’re on Next 15, and the constraints for Next 16 later) | short doc note + pinned versions |

---

## 10a — Stabilize Clerk + React runtime

### Hypotheses (ranked)

1. **Clerk + Next 15 App Router boundary**: Clerk provider must execute in a fully client-safe boundary (and sometimes requires a version bump to support Next 15).
2. **Stale dev artifacts after upgrade**: `.next` contains cached chunks for a prior Next runtime.
3. **React runtime mismatch at dev time**: not multiple React versions (verify with `npm ls react`), but invalid import path / compiled runtime assumptions.

### Steps

- Clear build artifacts:

```bash
rm -rf .next
npm run dev
```

- Ensure `ClerkProvider` is only used via `components/clerk-root-provider.tsx` (client).
- Fix `ClerkRootProvider` typing (use Clerk’s `Appearance` type rather than `unknown`) so typecheck is clean.
- If runtime errors persist:
  - Upgrade **`@clerk/nextjs`** to the latest compatible version for Next 15.
  - Re-test sign-in/out flows and admin shell routes.

### Done criteria

- `/admin/dashboard` loads in dev with no runtime overlay.
- SignedIn/SignedOut blocks render correctly (avatar/sign-in CTA).

---

## 10b — Route handler typing migration (Next 15)

### What changed

Next 15’s generated route type validators expect App Router route handlers to accept:

- `request: NextRequest`
- `context: { params: Promise<...> }` for dynamic segments

### Migration pattern (canonical)

```ts
import type { NextRequest } from "next/server"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  // ...
}
```

### Known failing files (from `npm run typecheck`)

- `app/api/admin/staff/[userId]/deactivate/route.ts`
- `app/api/admin/staff/[userId]/reactivate/route.ts`
- `app/api/admin/staff/[userId]/resend-invite/route.ts`
- `app/api/admin/staff/[userId]/role/route.ts`
- `app/api/incidents/[id]/phase/route.ts`
- `app/api/waik-admin/organizations/[orgId]/facilities/[facilityId]/admins/route.ts`
- `app/api/waik-admin/organizations/[orgId]/facilities/[facilityId]/route.ts`
- `app/api/waik-admin/organizations/[orgId]/facilities/route.ts`
- `app/api/waik-admin/organizations/[orgId]/route.ts`

### Done criteria

- `npm run typecheck` passes (no `.next/types/validator.ts` errors).

---

## 10c — Route-by-route smoke sweep

### Systematic checklist (run in this order)

Public:
- `/` (landing)
- `/sign-in`, `/sign-up`, `/login` (whichever are active)

Staff:
- `/staff/dashboard`
- `/staff/incidents`
- `/staff/incidents/[id]`
- `/staff/assessments`

Admin:
- `/admin/dashboard` (tabs scroll, lists render)
- `/admin/incidents`
- `/admin/incidents/[id]`
- `/admin/residents`
- `/admin/assessments`
- `/admin/settings`

Super Admin:
- `/waik-admin`
- `/waik-admin/organizations/[orgId]`
- `/waik-admin/organizations/[orgId]/facilities/[facilityId]`

For each route:
- No red runtime overlay
- No hydration warnings in console
- Auth state behaves (SignedIn/SignedOut)
- Navigation keeps `facilityId` / `organizationId` under `/admin`

### Done criteria

- A short QA log is written with:
  - Route list
  - Pass/fail per route
  - Any follow-up issues (file + suspected cause)

---

## 10d — Upgrade posture (document guardrails)

We are choosing **Next 15** as “current stable major”. Next 16 is possible later but requires:
- ESLint 9+ (if we move to Next 16’s `eslint-config-next`)
- Retesting Clerk + middleware + App Router route handlers

**Pinned (see `package.json`):** `next@^15.5.15`, `eslint-config-next@^15.5.15`, `react@18.2.0`, `react-dom@18.2.0`, `@clerk/nextjs@^6.39.1`. Staying on 15 until Clerk, route validators, and CI are revalidated for the next major.

Stabilization guardrail:
- Avoid “drive-by” dependency upgrades to `latest` during this phase. If a package must move, pin it explicitly and re-run the Phase 3f checks (dev runtime + `npm run typecheck` + smoke sweep).

Done criteria:
- `phase_3f_task_handoff.md` + a short note in this README about the pinned versions and why.

---

## Conventions (required)

1. When you finish a task: set **Status: DONE** + date in its task file and rename to `*-done.md`.
2. Keep changes **small and reviewable**: runtime stabilization, then route typing, then QA.
3. Do not redesign. Only adjust UI if it’s required to fix runtime/hydration.

