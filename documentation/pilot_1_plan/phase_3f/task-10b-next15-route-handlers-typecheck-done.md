# Task 10b — Next 15 route handlers: make `npm run typecheck` pass

## Status: **DONE** (2026-04-26)

## Purpose

Next.js 15 changed App Router route handler typing; update handlers so the generated `.next/types/validator.ts` checks succeed and `npm run typecheck` passes.

---

## Context

`npm run typecheck` fails with messages like:

- handler uses `(request: Request, { params }: { params: { id: string } })`
- validator expects `(request: NextRequest, context: { params: Promise<{ id: string }> })`

Known failing files (from `tsc` output at time of writing):
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

## Constraints

- No behavior changes (auth, inputs, outputs) unless required for correctness.
- Prefer consistent handler signatures across all dynamic routes.

---

## Canonical migration pattern

```ts
import type { NextRequest } from "next/server"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  // existing logic...
}
```

Notes:
- Use `NextRequest` for the `request` parameter.
- Await `context.params` to extract route params.

---

## Tasks

- [ ] Update each failing route handler to the Next 15 signature
- [ ] Re-run `npm run typecheck` until it passes
- [ ] Spot-check that routes still behave in dev (no 500s from obvious param extraction mistakes)

---

## Verification

```bash
npm run typecheck
```

Optional sanity after typecheck:

```bash
npm run dev
```

Then hit at least one dynamic API route via UI:
- `/admin/settings/staff` actions (deactivate/reactivate/resend/role)
- Claiming phase endpoint: `PATCH /api/incidents/[id]/phase`

---

## Done criteria

- `npm run typecheck` passes with no `.next/types/validator.ts` errors.

## Outcome

- `npm run typecheck` now passes cleanly on Next 15.
- Follow-up fix discovered during verification: Next 15 also validates **page component props** for dynamic segments (`params?: Promise<...>`). Updated these pages accordingly:
  - `app/admin/incidents/[id]/page.tsx` (already using `useParams`, ensured it no longer relies on `{ params: { id } }` props)
  - `app/staff/incidents/[id]/page.tsx` (migrated to `params: Promise<{ id: string }>` and unwrapped to `incidentId` client-side)

