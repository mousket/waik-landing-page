# 04 — Notification preferences (`/admin/settings/notifications`)

## Purpose

Verify that **nudges** can differ by **incident type** and lifecycle moment: for each built-in type, the facility can set who gets notified **when the incident starts** and **when Phase 1 is signed**; global and quiet-hour style options (if present) work; the page also makes **PHI and device** expectations visible (e.g. personal device vs work device) even if some copy is read-only.

## Who and when

- **Persona:** Community admin (DON, risk, or designee).
- **When:** Onboarding a site, when roles change, or when explaining HIPAA-safe push behavior in a sales or clinical demo.

## How to get there

- **`/admin/settings/notifications`**

## What to look for (demo talk track)

- A **per–incident-type** layout (e.g. cards) with two blocks: **when started** and **when Phase 1 signed**, each with role toggles (DON, Therapy director, etc., per your role slugs).
- A **read-only** area describing **device** split (e.g. room only on personal phones, fuller detail on managed devices) — the important part for the pilot is that **expectations** are on-screen.
- **Save** and **hard reload** to show persistence in Mongo-backed preferences.

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 4.1 | Each **built-in** incident type has both **when started** and **when Phase 1 signed** controls. | | |
| 4.2 | Toggle a specific role off for one type/section (e.g. Fall, Phase 1 signed); **Save**. | | |
| 4.3 | **Hard reload** (Cmd+Shift+R or equivalent); that toggle is still off. | | |
| 4.4 | Global controls (e.g. quiet days, in-app nudge) behave as expected if your build includes them. | | |
| 4.5 | **PHI / device** guidance text is present and legible. | | |
| 4.6 | No silent failure: if save fails, the user gets an error. | | |

## If something fails

- Inspect `notificationPreferences` (or your Mixed field) on the facility in Mongo and compare to `lib/notification-prefs` merge behavior.

## Next guide

- [05-data-export.md](./05-data-export.md)
