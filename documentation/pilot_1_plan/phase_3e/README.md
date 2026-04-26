# Phase 3e — Admin facility context & data alignment

## Status: **COMPLETE** (2026-04-25)

All tasks **08a–08h** are done. See `task-08h-phase-3e-integration-verification-done.md` for build/grep sign-off and manual QA checklist.

## Epic overview

---

## Epic document

**`task-08-EPIC-admin-facility-data-alignment-done.md`** — one-page backlog for 08a–08h (status at top of that file).

## Goal

The admin UI now carries **`facilityId` and `organizationId` in the URL** (super-admin org entry, `AdminFacilitySwitcher`, nav preservation). **API routes and list pages** must use the *same* effective facility as the UI so “scope” is never wrong.

This phase **does not** change the marketing or Phase 3d design work; it tightens **authorization, data reads/writes, navigation, and documentation** for multi-facility / super-admin operation.

---

## Task index (execute in this order)

| Order | ID | Task | Task file (rename when **done** — see below) |
|------:|----|------|-----------------------------------------------|
| 1 | **08a** | Shared server helper: resolve **effective admin `facilityId`** from request + `getCurrentUser()` (super-admin + org admin rules, match existing `GET /api/incidents` / `GET /api/admin/dashboard-stats` patterns) | `task-08a-effective-admin-facility-done.md` **DONE** |
| 2 | **08b** | **Read** paths: apply effective facility to admin-consumed APIs (e.g. `GET /api/residents`, `GET /api/admin/staff` and any list endpoints the admin shell calls) | `task-08b-admin-read-apis-facility-scope-done.md` **DONE** |
| 3 | **08c** | **Write** paths: resident create, staff invite/import/reactivate/role/deactivate — same facility; **403** on cross-facility abuse; super-admin may target only allowed facilities | `task-08c-admin-write-apis-facility-scope-done.md` **DONE** |
| 4 | **08d** | **Client navigation:** use `buildAdminPathWithContext` (or equivalent) for every in-app `Link` / `router.push` under `/admin` that still drops `facilityId` / `organizationId` (incident detail back, breadcrumbs, ad-hoc buttons) | `task-08d-admin-nav-context-preservation-done.md` **DONE** |
| 5 | **08e** | **Admin list pages:** replace placeholders on `/admin/incidents`, `/admin/assessments` (and wire `/admin/intelligence` if it should list facility-scoped data) to real facility-scoped fetches | `task-08e-admin-list-pages-real-data-done.md` **DONE** |
| 6 | **08f** | **Documentation:** add or extend an “admin facility scoping” contract (cross-link `phase_3b/task-06a-layout-api-contract.md`; note query param + cookie-less model) | `task-08f-admin-facility-contract-docs-done.md` **DONE** |
| 7 | **08g** | **Telemetry (optional follow-up):** wire `[WAiK_TELEMETRY]` from `POST /api/telemetry/super-admin-admin-entry` to your log pipeline, or document deferral in `.env.example` / runbook | `task-08g-telemetry-pipeline-stub-done.md` **DONE** |
| 8 | **08h** | **Integration verification:** run QA checklist (super-admin: org + 0/1/many facilities; org admin; direct `/admin` entry); fix regressions; sign off | `task-08h-phase-3e-integration-verification-done.md` **DONE** |

### Extra tightening (fold into 08a/08h or track as sub-bullets)

- **Security audit:** non–super-admin users must not be able to pass a `facilityId` for another org; super-admin only where already implied by `api/facilities` rules.
- **Grep pass:** `user.facilityId` / `currentUser.facilityId` in `app/api` for routes hit by **admin** UI — list exceptions (e.g. staff-only routes) in `task-08f` or `08h` notes.
- **Parity:** admin dashboard tiles and list pages should fail consistently (same error UX) if `facilityId` is missing or invalid.

---

## Dependency order

```
08a → 08b → 08c → 08d → 08e → 08f → 08g (optional) → 08h
```

`08d` can start after **08a** is sketched (navigation does not require API work), but **ship order** should keep **08a → 08b → 08c** before **08e** so list pages do not show stale logic.

---

## When a task is **done** (convention)

1. In the **task markdown file**: add a `## Status` section or top-of-file line: **`Status: DONE`** and the date.
2. **Rename the file** to include `done` (repo convention), e.g.  
   `task-08a-effective-admin-facility.md` → `task-08a-effective-admin-facility-done.md`  
   (same pattern as `task-07a-design-audit-spec-done.md` in Phase 3d).
3. Update **this README** table: you may add a “Done” column or strikethrough the row — at minimum, search for remaining tasks without `done` in the filename.

---

## Handoff for the next agent

Continue from:

**`documentation/pilot_1_plan/phase_3e/phase_3e_task_handoff.md`**

**Optional follow-up (design / token tightening, not facility scope):**  
**`documentation/pilot_1_plan/phase_3e_2/README.md`** and **`phase_3e_2_task_handoff.md`**.

---

## Related prior work (already in codebase)

- `/admin` → `/admin/dashboard` redirect; `AdminFacilitySwitcher`; `buildAdminPathWithContext`; super-admin org → “Open Admin Dashboard” links; loading/empty when org has no facilities; `POST /api/telemetry/super-admin-admin-entry` + `[WAiK_TELEMETRY]` logging.

This phase **completes the loop** to APIs and list UIs.
