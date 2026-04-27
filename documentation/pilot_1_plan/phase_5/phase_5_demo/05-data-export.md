# 05 — Data export (`/admin/settings/export`)

## Purpose

Demonstrate **governed CSV export** for compliance and operations: **room-first** by default (no resident names in the standard incident export), an explicit **include names** path with a **PHI acknowledgment**, a **date window** for time-bounded exports, and separate actions for **incidents**, **assessments**, and **residents** (as implemented).

## Who and when

- **Persona:** Community admin, possibly with privacy officer in the room.
- **When:** IT/security review, state survey prep, or a demo of “we default to the safer CSV.”

## How to get there

- **`/admin/settings/export`**
- Keep admin **facility** context in the query string if your app requires it for the export API.

## What to look for (demo talk track)

- **Include resident names** starts **off**: incident CSV should include `roomNumber` and **not** a `residentName` column (unless you intentionally enable names).
- Flipping **names on** should open a **PHI** acknowledgment dialog; the toggle should not turn on without confirmation.
- **Window (days)** should bound incidents and assessments; residents export may be full **census**-style (confirm against your build).
- Browser opens the download (or a new tab) to **`/api/admin/export?...`**.

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 5.1 | With **names off**, run **incidents** export: open the file; confirm **room** column, **no** name column, expected headers (`reportedBy` etc. per your spec). | | |
| 5.2 | Use **include names** → acknowledgment appears **before** the control sticks on. | | |
| 5.3 | With **names on**, same export includes a **residentName** column. | | |
| 5.4 | **Days** (e.g. 90) changes row count or date range vs a shorter window (spot-check a date column). | | |
| 5.5 | **Assessments** and **residents** exports run without error; open files briefly. | | |
| 5.6 | Do **not** store PHI exports in shared unencrypted channels after the demo. | | |

## Compliance note

- Treat any CSV with **names** as **PHI**; delete test files or move to an approved store.

## Next guide

- [06-staff-management.md](./06-staff-management.md)
