# Phase 3e Epic — Admin facility context & data alignment
## One-page rollup (subtasks 08a–08h)

## Status

- **2026-04-25 — Phase 3e COMPLETE:** Tasks **08a–08h** are done; see **`task-08h-phase-3e-integration-verification-done.md`** and **`README.md`** in this folder.

**Phase:** 3e  
**Pilot plan:** `documentation/pilot_1_plan/phase_3e/README.md`

This file is the **single ordered backlog**; detailed spec can live in per-task files as they are created (see README naming).

**When you finish a subtask:** add **`Status: DONE`** (and date) in that task’s file, and **rename the file** to `*-done.md` (see `phase_3e/README.md`).

---

## Problem statement

The admin surface can show **`facilityId` / `organizationId` in the URL**, but several **API routes still scope only to `getCurrentUser().facilityId`**. Super admins and multi-facility org admins will see **wrong or empty data** in residents, staff, and future list pages. Navigation can still **drop** query context in deep links.

---

## Ordered work

### 08a — Effective admin facility helper (server)

- Add a small shared module (e.g. under `lib/`) that, given `Request` + `CurrentUser`, returns `{ facilityId, error?: Response }` consistent with:
  - `GET /api/admin/dashboard-stats` (`effectiveFacilityId`)
  - `GET /api/incidents` (super-admin `facilityId` query; org admin bound to their org)
  - `GET /api/facilities` (org filter for super admin)
- **Acceptance:** unit-style tests or inline comments documenting cases: super-admin + query, org admin + same-org facility, **403** for illegal cross-facility (non–super-admin).

### 08b — Read APIs (admin consumer)

- Apply **08a** to every **GET** (and list **POST** if any) used by the admin shell: at minimum **`/api/residents`**, **`/api/admin/staff`**, and any other route the admin pages call without passing facility in the body.
- **Acceptance:** with `?facilityId=` matching a permitted facility, list matches Mongo for that `facilityId`.

### 08c — Write APIs (admin consumer)

- Residents create, staff invite, CSV import confirm, reactivate, deactivate, role change: use **the same** effective facility as reads; no silent fallback to the wrong facility.
- **Acceptance:** attempts to act on another facility return **403** (or 400 with clear message) for non–super-admin.

### 08d — Client: preserve `facilityId` + `organizationId`

- Audit `/admin` for `Link` / `router.push` / breadcrumbs / “Back to dashboard” that omit context; use `buildAdminPathWithContext` from `lib/admin-nav-context.ts` or extend it.
- **Acceptance:** click-through from super-admin link → incidents detail → back → **query still present** (where switcher is not hidden).

### 08e — Admin list pages (real data)

- Replace placeholder **`/admin/incidents`**, **`/admin/assessments`** with facility-scoped lists (reuse mappers from staff/admin where possible). **`/admin/intelligence`:** either scope to facility or document “platform” scope in **08f** if intentionally global.
- **Acceptance:** changing facility in the switcher changes the lists (for super-admin / multi-facility).

### 08f — Documentation (contract)

- Short subsection: “How admin `facilityId` is chosen (URL, auto single-facility, super-admin).”
- Cross-link **Phase 3b task-06a** and **`/api/facilities?organizationId=`**.

### 08g — Telemetry (optional)

- **Done (2026-04-25):** `lib/telemetry-sink.ts` + `WAIK_TELEMETRY_HTTP_*` in `.env.example`; see **`task-08g-telemetry-pipeline-stub-done.md`**.
- Originally: option A (HTTP sink) or B (document deferral only) — A + B delivered (sink optional, console always).

### 08h — Integration verification

- **Done (2026-04-25):** Build pass, grep exception table, manual QA checklist in **`task-08h-phase-3e-integration-verification-done.md`**; **`README.md`** marked phase complete.

---

## Out of scope (unless you explicitly expand)

- Changing Phase 3d visual design.
- New product features beyond wiring existing data correctly.
