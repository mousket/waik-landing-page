# Phase 3f — Task handoff (for the next agent)

**Purpose:** Stabilize the codebase on **Next.js 15** by removing current runtime crashes (Clerk/React runtime) and updating App Router route handlers to satisfy Next 15’s generated type validators. Then perform a route-by-route smoke sweep and document outcomes.

**Read first:** `documentation/pilot_1_plan/phase_3f/phase_3f_readme.md`

---

## What is already implemented in this phase (do not redo)

- Next version bumped to **15.5.15** with matching `eslint-config-next`.
- Hydration hardening added:
  - `hooks/use-hydration-safe-relative-time.ts`
  - Used by admin components that display relative time
- Clerk provider refactor started:
  - `components/clerk-root-provider.tsx` (client wrapper)
  - `app/layout.tsx` uses `ClerkRootProvider` instead of importing `ClerkProvider` directly

---

## The two blocking problem clusters

### A) Runtime crashes (dev overlay)

Observed errors:
- `Cannot read properties of undefined (reading 'call')` (stack points near `ClerkProvider` usage in `app/layout.tsx`)
- `Cannot read properties of undefined (reading 'ReactCurrentDispatcher')` (stack includes `components/conditional-root-header.tsx`)

Most likely causes:
- Clerk/Next 15 compatibility boundary (provider executing in the wrong runtime context)
- stale `.next` artifacts from upgrade
- Clerk version needs bump to a Next 15–compatible release

### B) TypeScript validator failures (Next 15 route handlers)

`npm run typecheck` fails in `.next/types/validator.ts` because handlers still use the old signature:

- old: `(request: Request, { params }: { params: { id: string } })`
- expected: `(request: NextRequest, context: { params: Promise<{ id: string }> })`

Files currently listed by `tsc`:
- `app/api/admin/staff/[userId]/deactivate/route.ts`
- `app/api/admin/staff/[userId]/reactivate/route.ts`
- `app/api/admin/staff/[userId]/resend-invite/route.ts`
- `app/api/admin/staff/[userId]/role/route.ts`
- `app/api/incidents/[id]/phase/route.ts`
- `app/api/waik-admin/organizations/[orgId]/facilities/[facilityId]/admins/route.ts`
- `app/api/waik-admin/organizations/[orgId]/facilities/[facilityId]/route.ts`
- `app/api/waik-admin/organizations/[orgId]/facilities/route.ts`
- `app/api/waik-admin/organizations/[orgId]/route.ts`

---

## Specific task plan (execute in order)

### 10a — Runtime stabilization (Clerk + React runtime)

**Steps**
1. Clear cache: delete `.next`, restart dev server.
2. Fix `components/clerk-root-provider.tsx` types:
   - Use Clerk’s `Appearance` type (avoid `unknown`).
3. Re-test `/admin/dashboard` in dev.
4. If any runtime errors persist:
   - Upgrade `@clerk/nextjs` to the latest version.
   - Re-test sign-in/out and `SignedIn`/`SignedOut` blocks.

**Done when**
- `/admin/dashboard` loads without runtime overlay.
- `SignedIn`/`SignedOut` blocks render correctly.

### 10b — Route handler signature migration (Next 15)

**Canonical patch pattern**

```ts
import type { NextRequest } from "next/server"

export async function PATCH(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params
  // ...
}
```

**Steps**
1. Update every listed route handler to the new signature.
2. Prefer `NextRequest` import for request typing.
3. Run `npm run typecheck` until clean.

**Done when**
- `npm run typecheck` passes.

### 10c — Route-by-route smoke sweep + QA log

**Steps**
1. Public → staff → admin → super admin (full list is in README).
2. For each route, record: pass/fail, console warnings, and any follow-up.

**Done when**
- A QA log exists (short bullets are fine).

### 10d — Document upgrade posture

**Steps**
- Write a short note explaining why we’re on Next 15 and what needs to happen before Next 16.

**Done when**
- README updated and any new follow-ups written down.

---

## “AI personality” system (how the agent should operate)

The agent working Phase 3f should behave like a **stability engineer**:

- **Evidence-driven**: reproduce each error, capture the stack, patch, then re-run the same reproduction.
- **One axis at a time**:
  - Fix runtime crashes first (unblocks browsing),
  - then fix typecheck (unblocks CI/PR confidence),
  - then do route sweep (catches stragglers).
- **Prefer minimal diffs**: no refactors unless required to fix Next 15 semantics.
- **Never “fix” by disabling checks** (no `skipLibCheck` bandaids, no `--legacy-peer-deps`, no `any` casts) unless explicitly documented and justified.
- **Clear verification**:
  - After each change set: run `npm run typecheck`
  - For runtime changes: run `npm run dev` and load `/admin/dashboard`

If stuck:
- First suspect: `.next` cache + stale runtime chunks.
- Second suspect: Clerk version mismatch with Next 15.
- Third suspect: route handler signature types.

---

## Files the agent should start with

- `app/layout.tsx`
- `components/clerk-root-provider.tsx`
- `components/conditional-root-header.tsx`
- The route handlers listed in the TypeScript error output.

