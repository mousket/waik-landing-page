# Phase 8 — Staff–admin operational surface parity

## Status: **NOT STARTED**

Unify **Incidents**, **Assessments**, and **Residents** list experiences across **`/staff/*`** and **`/admin/*`** so the same building blocks, layout rhythm, and data density rules apply wherever both roles need the same operational view. **Staff patterns are the visual and shell baseline** unless a workspace rule explicitly requires an admin variant (e.g. all-incidents table on desktop).

---

## Epic folder

**`documentation/pilot_1_plan/phase_8/`**

Agents should read **`AGENT-HANDOFF.md`** first, then execute tasks **18 → 21** in order.

---

## Goal

- One **shared implementation path** (hooks + presentational modules) with **thin route wrappers** under `app/staff/...` and `app/admin/...`.
- **RBAC by capability**, not duplicate pages: admin-only actions (create resident, facility-scoped URLs, investigation links) stay gated; staff never gains admin powers “for parity.”
- **Assessments:** replace the staff placeholder with the **same real list** behavior as admin (staff-safe API + fields only).

---

## Non-goals (defer unless product explicitly expands scope)

- Merging into a **single canonical URL** for both roles (optional follow-up after shared modules ship).
- Full **Intelligence** parity between staff and admin in this phase.
- Changing **incident reporting** authoring flow (`/staff/report`) beyond links/copy needed for list parity.

---

## Constraints (must follow)

- **`.cursor/rules/waik-ui-ux-patterns.mdc`** — scroll shell (`h-dvh`, `min-h-0`, `overflow-y-auto` chain), tabs styling where relevant, all-incidents **table** preference for high-scan admin pipeline views, avoid breaking resident/overview patterns.
- **Admin facility context** — preserve `facilityId` / `organizationId` query preservation (`buildAdminPathWithContext`, `useAdminUrlSearchParams`) on admin links and fetches.
- **API boundaries** — prefer existing `/api/staff/*` and `/api/admin/*` (or facility-scoped `/api/incidents` where already used); add a shared client helper rather than calling admin-only routes from staff.

---

## Task index (execute in this order)

| Order | ID | Task | Task file |
|------:|----|------|-----------|
| 1 | **18** | Incidents: extract shared list/detail primitives; align admin + staff | [`task-18-incidents-staff-admin-parity.md`](./task-18-incidents-staff-admin-parity.md) |
| 2 | **19** | Residents: shared search/list; admin-only create gated | [`task-19-residents-staff-admin-parity.md`](./task-19-residents-staff-admin-parity.md) |
| 3 | **20** | Assessments: staff real data + shared module with admin | [`task-20-assessments-staff-admin-parity.md`](./task-20-assessments-staff-admin-parity.md) |
| 4 | **21** | Integration verification, RBAC sanity, scroll/nav QA | [`task-21-phase-8-integration-verification.md`](./task-21-phase-8-integration-verification.md) |

---

## Dependency order

```
18 → 19 → 20 → 21
```

Task **19** may start after **18** is far enough along that shared patterns (cards, headers, loading states) exist—but avoid merge conflicts by sequencing **18** first.

---

## When a task is **done** (convention)

1. Add **`Status: DONE`** and date at top of the task file (or a `## Status` section).
2. **Rename** the file to include **`done`**, e.g. `task-18-incidents-staff-admin-parity-done.md`.
3. Update **this README** task table or note completion in **`AGENT-HANDOFF.md`**.

---

## Primary code touchpoints (starting inventory)

| Area | Staff | Admin |
|------|-------|-------|
| Incidents list | `app/staff/incidents/`, `staff-incidents-list-client.tsx` | `app/admin/incidents/page.tsx`, `AllIncidentsFilterBar`, `resident-incidents-section` filters |
| Residents | `app/staff/residents/`, `staff-residents-client.tsx` | `app/admin/residents/page.tsx` |
| Assessments | `app/staff/assessments/page.tsx` (placeholder) | `app/admin/assessments/page.tsx` |
| Shell | `components/staff/staff-app-shell.tsx` | `components/admin/admin-app-shell.tsx` |

---

## Related docs

- Phase 3e admin facility alignment: `documentation/pilot_1_plan/phase_3e/README.md`
- Phase 7 navigation / history spec (may overlap success criteria): `documentation/pilot_1_plan/phase_7/task-14-navigation-history.md`
