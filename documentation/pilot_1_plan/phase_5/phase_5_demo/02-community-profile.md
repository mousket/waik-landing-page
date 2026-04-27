# 02 — Community profile (`/admin/settings/profile`)

## Purpose

Validate **facility metadata** the pilot relies on: identity (name, location), **primary contact**, and especially the **mandated reporting window** (hours to external reporting) so it saves to Mongo and survives reloads.

## Who and when

- **Persona:** Community admin.
- **When:** Early in a pilot, whenever facility details change, or when proving compliance config is self-service (no engineer edit).

## How to get there

- **`/admin/settings/profile`** (from the hub, or with `?facilityId=…` as your app requires).

## What to look for (demo talk track)

- Clear sections for **community identity** (name, type, state, bed count) and **contacts**.
- A control for **mandated reporting** window in **hours** (or as your UI labels it) with a sensible default (e.g. 2) and a save path (button + toast or inline success).
- **Persistence:** after save, a full page reload should show the same values.

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 2.1 | Page loads with current facility data (no empty critical fields if DB is seeded). | | |
| 2.2 | Change **mandated reporting window** to a different value (e.g. 4 hours). | | |
| 2.3 | **Save** succeeds (toast, banner, or redirect). | | |
| 2.4 | **Reload** the page: the new value is still there. | | |
| 2.5 | Other required fields (state, contact email/phone, etc.) match your pilot contract. | | |
| 2.6 | Invalid or empty required fields are blocked with clear errors (if applicable). | | |

## If something fails

- Confirm **`PATCH /api/admin/facility`** (or equivalent) with correct `facilityId` for super-admin-scoped admin users.
- Verify the facility document in Mongo has `reportingConfig.mandatedReportingWindowHours` (or your schema’s field) after save.

## Next guide

- [03-incident-configuration.md](./03-incident-configuration.md)
