# Task 08f — Documentation: admin facility scoping contract

**Phase:** 3e  
**Status:** DONE (2026-04-25)

## Admin facility scoping (Phase 3e)

- **No cookie for facility:** The browser carries **`facilityId`** and optional **`organizationId`** in the **URL** on `/admin/*`. Nav links use `buildAdminPathWithContext` in `lib/admin-nav-context.ts` so org/super-admin context is preserved.
- **Server resolution:** `resolveEffectiveAdminFacility` in `lib/effective-admin-facility.ts` turns `Request` (query + optional JSON hints on POST) plus `getCurrentUser()` into a single **effective** `{ facilityId, organizationId }`. It validates against `FacilityModel` (active facility, org rules). Super-admins may target any active facility; if **`organizationId`** is present in the request it must match the facility’s org.
- **List APIs:** `GET /api/incidents`, `GET /api/admin/dashboard-stats`, `GET /api/admin/staff`, `GET /api/residents`, and `GET /api/admin/assessments` all use the same effective facility as the UI. Pass `?facilityId=` and, when scoping a super-admin to one org, `?organizationId=`.
- **Super-admin facility lists:** `GET /api/facilities?organizationId=` — see Phase 3b incident/layout contract: `documentation/pilot_1_plan/phase_3b/task-06a-layout-api-contract.md`.

## Telemetry (08g)

- **`POST /api/telemetry/super-admin-admin-entry`** — super-admins with `?organizationId=` on admin entry; see `lib/telemetry-sink.ts`. Events are always logged as `[WAiK_TELEMETRY]` JSON. Optional: set `WAIK_TELEMETRY_HTTP_URL` (and auth headers) in `.env` to forward the same payload to an HTTP ingest; see `.env.example`.

## Exceptions (unchanged in 3e)

- **Staff PWA** routes (e.g. `GET /api/assessments/due`, `GET /api/staff/*`) may still use the session’s primary facility; they are not required to follow the admin URL param model. A full **grep table** of `user.facilityId` / `currentUser.facilityId` in `app/api` is in **`task-08h-phase-3e-integration-verification-done.md`**.

## When done

Set **Status: DONE** (add date) and **rename** this file to `task-08f-admin-facility-contract-docs-done.md`.
