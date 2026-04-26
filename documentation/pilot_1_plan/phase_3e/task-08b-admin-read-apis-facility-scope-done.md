# Task 08b — Admin read APIs: facility scope

**Phase:** 3e  
**Status:** DONE (2026-04-25)

## Delivered

- `GET /api/admin/dashboard-stats` — uses `resolveEffectiveAdminFacility`.
- `GET /api/incidents` — uses shared helper; dashboard incident fetches pass `organizationId` when present (`admin-dashboard-shell`, `active-investigations-tab`, `needs-attention-tab`, `closed-incidents-tab`).
- `GET /api/admin/staff` — uses shared helper.
- `GET /api/residents` — uses shared helper (query on GET).
- **New** `GET /api/admin/assessments` — facility-scoped assessment list for admin UI.

## When done

Set **Status: DONE** (add date) and **rename** this file to `task-08b-admin-read-apis-facility-scope-done.md`.
