# Phase 7 — Navigation, Intelligence & Imports

**Last updated:** 2026-05-19  
**Status:** Phase 7 tasks **14–17** **done (v1)**. Task 16 follow-up (assessment cron, completeness notify, archive UI) landed. Manual QA and `PILOT_READY.md` checkboxes remain.

Handoff doc for the next agent. Update this file when you land more Phase 7 work.

---

## Recommended execution order

| Order | Task | Focus | Status |
|------:|------|--------|--------|
| 1 | [task-16](./task-16-notification-center-done.md) | Notification center | **Done (v1)** — injury/IDT triggers, archive API, load more |
| 2 | [task-17](./task-17-bulk-import-done.md) | Bulk import staff + residents | **Done (v1)** — see below |
| 3 | [task-14](./task-14-navigation-history-done.md) | Staff incident sections, Answer Now, nav | **Done (v1)** — see below |
| 4 | [task-15](./task-15-community-intelligence-done.md) | Staff intelligence page | **Done (v1)** — see below |

---

## Task 17 — Bulk import (v1, create-only)

### Product rules

- **Create-only** — no `action` column; no bulk deactivate/discharge via CSV in v1.
- **Remove** in the app: Staff → deactivate; Residents → status (`discharged`, `inactive`, etc.).
- **Staff** duplicate email → yellow “Exists”, not imported.
- **Residents** duplicate name+room in DB → yellow “Duplicate”, skipped on confirm.
- **Residents** same room+name warning → yellow “Warning”, still importable.

### CSV templates

**Staff** (`lib/import/staff-rows.ts`):

```csv
first_name,last_name,email,role_slug,phone,device_type,unit
```

**Residents** (`lib/import/resident-rows.ts`):

```csv
first_name,last_name,room_number,care_level,preferred_name,wing,date_of_birth,admission_date,gender,primary_diagnosis,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,status
```

- Accepts **`.csv`** and **`.xlsx`** (first sheet).
- Header alias: `role` → `role_slug` for staff.

### UI entry points

| Surface | Path |
|---------|------|
| Staff import | Admin → Settings → Staff → **Import CSV / Excel** |
| Resident import | Admin → Residents → **Import CSV / Excel** |

Shared dialog: `components/admin/bulk-import-dialog.tsx`.

---

## Files created (2026-05-18)

| File | Purpose |
|------|---------|
| `lib/import-parser.ts` | CSV + Excel parse, normalized headers |
| `lib/import/staff-rows.ts` | Staff template, validation |
| `lib/import/resident-rows.ts` | Resident template, validation, date parse |
| `components/admin/bulk-import-dialog.tsx` | 3-step upload → preview → confirm |
| `app/api/admin/residents/import/route.ts` | Parse + validate resident file |
| `app/api/admin/residents/import/confirm/route.ts` | Create residents from valid rows |
| `__tests__/import-parser.test.ts` | Parser / validator smoke tests |
| `documentation/pilot_1_plan/phase_7/README.md` | This handoff |

---

## Files modified (2026-05-18)

| File | Change |
|------|--------|
| `lib/csv-staff.ts` | Re-exports from `import-parser` + `staff-rows` (backward compat) |
| `app/api/admin/staff/import/route.ts` | Uses shared parser + extended columns |
| `app/api/admin/staff/import/confirm/route.ts` | Passes `phone`, `device_type`, `unit` to invite |
| `lib/admin-staff-invite.ts` | Persists optional phone, deviceType, selectedUnit |
| `backend/src/models/user.model.ts` | Optional `phone` field |
| `app/admin/settings/staff/page.tsx` | `BulkImportDialog`, updated template |
| `app/admin/residents/page.tsx` | Import button + `BulkImportDialog` |
| `package.json` | Added `xlsx` dependency |

---

## API routes

| Method | Path | Role |
|--------|------|------|
| POST | `/api/admin/staff/import` | Preview staff rows (`multipart` field `file`) |
| POST | `/api/admin/staff/import/confirm` | JSON `{ rows }` — valid rows only |
| POST | `/api/admin/residents/import` | Preview resident rows |
| POST | `/api/admin/residents/import/confirm` | JSON `{ rows }` — valid + warning rows |

All use `resolveEffectiveAdminFacility` / `requireCanInviteStaff` (staff) or resident manage permission (residents).

---

## Task 14 — Navigation & incident history (v1)

- **Staff nav:** 4 tabs (Home, Incidents, Assessments, Intelligence) in `staff-bottom-nav.tsx` / `staff-app-shell.tsx`.
- **`/staff/incidents`:** Active right now · My reports (filter tabs) · Tasks assigned to me; report CTA card.
- **`GET /api/staff/incidents`:** `{ active, myHistory, assignedToMe, incidents }` (`incidents` = legacy alias for `myHistory`).
- **`lib/staff-incident-access.ts`:** Reporters and IDT assignees can load `GET /api/incidents/[id]`.
- **`/staff/assessments`:** Activity/Dietary shortcuts, due soon, history with type filter.

---

## Task 15 — Community intelligence (v1)

### Staff (`/staff/intelligence`)

- `components/staff/staff-intelligence-client.tsx` — ask bar, suggested questions, answers with `inc-…` links → `/staff/incidents/[id]`.
- `POST /api/intelligence/query` — non-admins forced to `scope: personal`; filters by reporter Mongo + Clerk ids via `staffIds`.

### Admin (`/admin/intelligence`)

- Ask-anything search, suggested queries, completeness chart, auto insight cards.
- `GET /api/admin/intelligence/insights` — Redis cache `waik:insights:{facilityId}` (1h TTL) via `lib/admin-community-intelligence.ts`.

---

## Task 16 — Notification center (follow-up 2026-05-19)

- **Assessment due (3 days)** — `lib/process-assessment-reminders.ts` + daily cron (`vercel.json` 06:00 UTC); dedupe via `Assessment.dueSoonReminderFor`.
- **Completeness scored** — LOW inbox item to reporter after Phase 1 sign-off (`report-completeness-scored`).
- **Archive** — button on full inbox page (`PATCH /api/notifications/[id]/archive`).

---

## What’s next

1. **Manual QA** — Import templates, notifications (archive + assessment cron), staff/admin intelligence, incident list sections.
2. **Optional** — Import v2 `action` column; staff intelligence over IDT-assigned incidents.
3. **PILOT_READY.md** — Tick Phase 7 task checkboxes after QA.

---

## Verification commands

```bash
npm run typecheck
npm run test -- __tests__/import-parser.test.ts __tests__/staff-incident-access.test.ts __tests__/process-assessment-reminders.test.ts
npm run lint
```

---

## Related docs

- Task specs: [task-14](./task-14-navigation-history-done.md), [task-15](./task-15-community-intelligence-done.md), [task-16](./task-16-notification-center-done.md), [task-17](./task-17-bulk-import-done.md)
- Master checklist: [../PILOT_READY.md](../PILOT_READY.md) (Phase 7 section)
- UI patterns: `.cursor/rules/waik-ui-ux-patterns.mdc`
