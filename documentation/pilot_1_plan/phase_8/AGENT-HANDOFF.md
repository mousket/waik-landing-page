# Phase 8 — Agent handoff

## Start here

You are implementing **Phase 8: Staff–admin operational surface parity** for WAiK (Next.js App Router).

1. Read **`documentation/pilot_1_plan/phase_8/README.md`** (goal, non-goals, constraints).
2. Read **`.cursor/rules/waik-ui-ux-patterns.mdc`** before changing layout or incidents list shape.
3. Execute tasks in order:
   - [`task-18-incidents-staff-admin-parity.md`](./task-18-incidents-staff-admin-parity.md)
   - [`task-19-residents-staff-admin-parity.md`](./task-19-residents-staff-admin-parity.md)
   - [`task-20-assessments-staff-admin-parity.md`](./task-20-assessments-staff-admin-parity.md)
   - [`task-21-phase-8-integration-verification.md`](./task-21-phase-8-integration-verification.md)

Paste each task’s **`## Implementation Prompt`** block into the agent as the authoritative instruction for that chunk of work.

---

## Principles (do not skip)

- **Shared modules, thin routes:** factor list/table/card UI and data hooks into `components/...` or `lib/...`; `app/staff/*` and `app/admin/*` pages should mostly compose shared pieces.
- **Staff as baseline:** match staff spacing, gradient backdrop, `PageHeader`, card rhythm, and mobile width constraints (`max-w-lg` where staff uses it) **unless** an existing rule requires an admin-specific pattern (e.g. full-width table + `AllIncidentsFilterBar` on `/admin/incidents`).
- **Admin context:** every admin `Link`/`router.push` that must stay scoped should use existing helpers (`buildAdminPathWithContext`, `getAdminContextQueryString`).
- **Security:** staff UI must not call admin-only APIs or expose admin-only fields; use capability flags props (`showCreateResident`, `linkToAdminInvestigation`, etc.) rather than forking security logic ad hoc.

---

## Definition of done (phase level)

- Incidents, Residents, and Assessments have **no accidental “two different products”** drift: same components/patterns for shared sections; differences are **explicit props** or **role-specific columns**.
- Staff assessments page is **not** a placeholder if admin has live assessment rows for the same facility.
- Scroll and shell behavior match **`waik-ui-ux-patterns`** on long pages.
- Task **21** checklist signed off.

---

## After completion

- Rename completed task files with `-done` suffix and set status inside each file.
- Optionally add a one-line entry to `documentation/pilot_1_plan/README.md` Phase Overview table noting Phase 8 complete.
