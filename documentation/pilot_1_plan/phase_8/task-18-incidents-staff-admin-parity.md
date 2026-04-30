# Task 18 — Incidents list parity (staff + admin shared surfaces)
## Phase: 8 — Staff–admin operational surface parity
## Estimated Time: 6–10 hours
## Depends On: Phase 3e facility-scoped admin lists (task-08e era); stable `/api/staff/incidents` and `/api/incidents` (or equivalent)

---

## Why This Task Exists

Staff incidents (`StaffIncidentsListClient`, `/api/staff/incidents`) and admin incidents (`app/admin/incidents/page.tsx`, filters + table, `/api/incidents` + context query) evolved separately. Phase 8 makes them **one implementation family**: shared loading/empty/error UX, shared row metadata presentation where applicable, and explicit differences only for **scope** (my reports vs facility pipeline) and **admin-only filters**.

---

## Success Criteria

- [ ] Shared module(s) under `components/` or `lib/` used by both staff and admin incidents list pages (no large copy-paste blocks left for card metadata, phase badge, completeness ring, date formatting).
- [ ] Staff page keeps **`/staff/report`** primary CTA and staff-appropriate copy (“My incidents”).
- [ ] Admin page keeps **`AllIncidentsFilterBar`** and **table** layout for the facility pipeline (per `waik-ui-ux-patterns`); staff may remain card list or adopt responsive table—**do not** remove the admin table without product sign-off.
- [ ] Admin links preserve **`facilityId` / `organizationId`** via existing nav helpers.
- [ ] Type-safe mapping from each API DTO to a **shared display model** where rows are comparable (or document why two models stay separate).
- [ ] No regression: staff still loads only staff-scoped incidents; admin still loads facility-scoped list.

---

## Test Cases

```
TEST 1 — Staff list loads
  Action: Log in as staff; open /staff/incidents
  Expected: Same behavioral scope as before; UI matches new shared styling primitives

TEST 2 — Admin list loads with context
  Action: Super-admin with facility in URL; open /admin/incidents
  Expected: Data scoped to facility; filters work; internal links keep query context

TEST 3 — Deep link
  Action: From admin table open incident detail; navigate back
  Expected: Context params preserved per existing phase 3e behavior

TEST 4 — Empty states
  Action: User with zero incidents (staff) / facility with zero (admin)
  Expected: Empty state copy appropriate to role; no console errors
```

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Phase 8 Task 18 — Incidents staff/admin parity.

Goals:
1. Extract shared presentation and/or hooks for incidents LIST rows from:
   - app/staff/incidents/staff-incidents-list-client.tsx
   - app/admin/incidents/page.tsx
2. Staff remains the UX baseline for spacing, PageHeader, gradient backdrop, max width where applicable.
3. Admin MUST keep the table + AllIncidentsFilterBar pattern for scanability (waik-ui-ux-patterns).
4. Use buildAdminPathWithContext / getAdminContextQueryString for admin navigation and fetches.
5. Do not broaden staff data access; keep using /api/staff/incidents for staff and existing admin fetch for admin.

Deliverables:
- New shared file(s) in components/ or lib/report/ or lib/incidents/ (pick consistent naming).
- Thin wrappers in app/staff/incidents and app/admin/incidents composing shared pieces.
- Minimal diff outside incidents surfaces unless a shared type belongs in lib/types.

Verify: staff and admin both render; filters/table unchanged functionally on admin.
```

---

## Notes for implementers

- If Phase 7 **task-14** sections (“Active / My History / Assigned to Me”) are not yet implemented on staff, either fold that work **into Task 18** if already prioritized, or keep Task 18 strictly **parity of existing** behavior and leave multi-section staff lists as a follow-up—**document the choice** in the PR.
- Reuse existing pills/badges: `PhaseBadge`, `CompletionRing`, `staff-incident-pill` where appropriate instead of new variants.
