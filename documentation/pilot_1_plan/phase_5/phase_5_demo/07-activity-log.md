# 07 — Activity log (`/admin/settings/activity`)

## Purpose

Show a **durable record** of important actions: logins, incident work, phase transitions, invites, role changes, and other auditable events your build records. The activity page supports **compliance** (“who did what, when?”) and **pilot health** (is the site actually in use?).

## Who and when

- **Persona:** Community admin, compliance lead, or WAiK in a read-only review.
- **When:** Quarterly audit, investigation support, or after staff claim “nobody is using the app” (you can show volume and who touched incidents).

## How to get there

- **`/admin/settings/activity`**
- Often reached from a **link in the settings footer** on the hub; confirm your build surfaces it there or from the app shell as intended.

## What to look for (demo talk track)

- A list with **time**, **actor** (or email), **action** type, and a short **summary** or payload.
- **Filters** by user and/or **action** type, if the UI advertises them.
- **Recency** and a sensible **limit** (e.g. last 100 events) so the page stays fast.
- A **read-only** posture: no accidental edits to history from this view.

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 7.1 | Page opens without error for an admin. | | |
| 7.2 | You see **recent** events (not empty in an active environment). | | |
| 7.3 | **Filter by user** (or search) refines the list. | | |
| 7.4 | **Filter by action** type (if available) refines the list. | | |
| 7.5 | New actions you trigger (e.g. a test invite) appear within a **reasonable** delay. | | |
| 7.6 | Paging or “load more” behaves if your data set is large. | | |

## If the list is empty

- Run a few actions in the app (log in, open an incident) and re-check. If still empty, verify the activity **session** and **ingestion** pipeline for your environment.

## Next guide

- [08-help-and-facility-id.md](./08-help-and-facility-id.md)
