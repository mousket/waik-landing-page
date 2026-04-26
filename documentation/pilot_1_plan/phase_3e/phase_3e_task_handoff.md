# Phase 3e — Task handoff (for the next agent)

**Status (2026-04-25):** Phase **3e is complete.** The sections below are historical context for anyone changing admin facility behavior later.

## Purpose

Phase 3e was **Admin facility context & data alignment**: the UI carries **`facilityId`** and **`organizationId`** in the URL with a facility switcher; **APIs and admin list pages** use the same effective scope so data is never wrong for super admins or multi-facility orgs.

---

## Canonical documents (read in order)

1. **Epic + task order:** `documentation/pilot_1_plan/phase_3e/README.md`
2. **One-page backlog:** `documentation/pilot_1_plan/phase_3e/task-08-EPIC-admin-facility-data-alignment-done.md`
3. **Prior API contract (incidents / layout):** `documentation/pilot_1_plan/phase_3b/task-06a-layout-api-contract.md`

---

## What is already implemented (do not redo unless broken)

- **`/admin` → `/admin/dashboard`** (`app/admin/page.tsx`).
- **Super admin → admin entry:** “Open Admin Dashboard” from `waik-admin` org / facility pages with `organizationId` / `facilityId` query params.
- **`AdminFacilitySwitcher`** + **`buildAdminPathWithContext`** (nav + mobile bottom nav + logo preserve query).
- **`GET /api/facilities?organizationId=`** for super-admin org-scoped lists.
- **Loading / empty** when an org has no facilities (super admin org page + empty switcher messaging).
- **Telemetry:** `POST /api/telemetry/super-admin-admin-entry` — logs **`[WAiK_TELEMETRY]`** JSON for super-admin org-scoped admin entry (`SuperAdminAdminEntryTelemetry` in `AdminAppShell`).

Key code references:

- `components/admin/admin-app-shell.tsx` — switcher, `isWaikSuperAdmin`, telemetry child
- `components/admin/admin-facility-switcher.tsx`
- `lib/admin-nav-context.ts`
- `app/api/telemetry/super-admin-admin-entry/route.ts`
- `app/waik-admin/organizations/[orgId]/page.tsx` — empty state, disabled “Open Admin Dashboard” with zero facilities

---

## What you should do next

**Phase 3e is complete (2026-04-25).** Implementation and verification: **`task-08h-phase-3e-integration-verification-done.md`**. For new features that touch admin facility scope, read **`lib/effective-admin-facility.ts`** and **`task-08f-admin-facility-contract-docs-done.md`**.

---

## When you complete a task (required convention)

1. In that task’s markdown file, set **`Status: DONE`** and the **date** (a `## Status` section is fine).
2. **Rename the file** to include **`done`**, e.g.  
   `task-08a-effective-admin-facility.md` → `task-08a-effective-admin-facility-done.md`  
   (Same pattern as Phase 3d: e.g. `task-07a-design-audit-spec-done.md`.)
3. Update **`phase_3e/README.md`** if you keep a check-off list so the next person sees progress.

---

## Pitfalls to avoid

- **Do not** trust `facilityId` from the body alone for auth — always pair with `getCurrentUser()` and org membership rules (mirror `api/facilities` and `api/incidents` behavior).
- **Staff-only routes** (e.g. some `/api/staff/*`) may legitimately still use the session’s facility; document exceptions in **08f/08h** instead of forcing one pattern everywhere.
- **React Strict Mode** may double-call client effects; telemetry is already best-effort and non-blocking.

---

## Suggested “done” for Phase 3e

Phase 3e is **complete** when **08h** is **DONE** (file renamed with `done`, README updated) and a short note exists in this folder or in `task-08h` listing **QA results** and any **known follow-ups** (e.g. full analytics phase).

---

## If you are also doing Phase 3d (design) in parallel

Phase **3d** (design unification) touches some of the same files (`admin-app-shell`, admin pages). Prefer **3e** for **logic/API** and **3d** for **tokens/layout**; if a conflict arises, **preserve API behavior** and adjust styling in a follow-up.
