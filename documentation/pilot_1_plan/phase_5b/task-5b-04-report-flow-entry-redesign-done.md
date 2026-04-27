# task-5b-04 — Report flow entry redesign — done

**Phase:** 5b — Staff experience redesign

## Delivered

- **`app/staff/report/page.tsx`**
  - **Type select** screen: dark teal header aligned with the staff dashboard shift header, back to `/staff/dashboard`, four tappable type cards (icons, descriptions, `min-h-20`).
  - **Resident** step: `StaffResidentSearch` + **Start report**; draft is created only after a resident is chosen, so the incident is created with real `residentName` / `residentRoom` / `residentId`.
- **`components/staff/resident-search.tsx`**
  - Debounced search against `GET /api/residents?search=...`, result list, selected chip with clear.
- **API / DB**
  - `POST /api/incidents` accepts optional **`residentId`**
  - `createIncidentFromReport` persists `residentId` on the incident document when provided.

## How to verify

See **`documentation/pilot_1_plan/phase_5b/staff-experience-test-guide.md`** (section 7, New incident report).

## Related

- Source spec: `task-5b-04-05-06.md` (Task 5b-04 block).
