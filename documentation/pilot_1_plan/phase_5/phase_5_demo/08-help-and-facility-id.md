# 08 — Help and support (`/admin/settings/help`)

## Purpose

On-site **support and orientation**: display the **facility identifier** (for support tickets and seed alignment), a **contact email** or escalation path, and a link to **external documentation** (if your build includes it). The goal is a single “about this site” place that does not require a spreadsheet.

## Who and when

- **Persona:** Any community admin or DON who might call WAiK with “which environment am I in?”
- **When:** First day of a pilot, every support call, or a demo where you point at the on-screen **facility id**.

## How to get there

- **`/admin/settings/help`**
- Also reachable as the **Help and support** card on **`/admin/settings`**.

## What to look for (demo talk track)

- **Facility ID** (or equivalent) is visible and **copyable** (or at least read-aloudable) so it can be pasted into Slack or a ticket.
- **Support** email (or a mailto) matches your runbook.
- **External docs** link (if any) opens in a new tab and is the correct product doc set for the pilot.
- If your team uses **onboarding date** or **plan** in support scripts, they may also appear here or on profile; align what you show with what support expects.

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 8.1 | All copy renders without layout breaks on mobile and desktop. | | |
| 8.2 | **Facility id** matches the `facilityId` in Mongo (or the effective scope in the app). | | |
| 8.3 | **Support** contact is correct for this deployment. | | |
| 8.4 | **Docs** link (if present) is valid (no 404). | | |
| 8.5 | No private keys or internal-only URLs in the public field (security sanity check). | | |

## Next guide

- [09-super-admin.md](./09-super-admin.md)
