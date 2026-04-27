# 01 — Settings home (`/admin/settings`)

## Purpose

Confirm the **hub** for Phase 5 settings: all primary destinations are one click away, and **admin context** (`facilityId` / `organizationId` if your deployment uses it) is preserved in links so deep links and APIs stay scoped to the right community.

## Who and when

- **Persona:** Community admin (admin tier, `facilityId` set).
- **When:** First stop before testing individual settings pages, or after changing facility in the app shell to confirm links follow the new scope.

## How to get there

1. Sign in as a community admin.
2. Navigate to **`/admin/settings`**, or use the app’s Settings entry from the admin shell.
3. If you use `?facilityId=…` in the address bar, keep it while testing so cards open with the same query string.

## What to look for (demo talk track)

- **Six** navigation cards, typically: Community profile, Incident configuration, Staff, Notification preferences, Data export, and Help and support.
- A **footer** (or secondary link) that points to **Activity** (audit log) — that route may not be a seventh card, but is part of the Task 10 story; confirm it is discoverable.
- **Visual consistency** with the rest of admin: spacing, card layout, and icons legible on laptop and a smaller viewport.

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 1.1 | Exactly **six** cards for the main settings areas. | | |
| 1.2 | Every card’s link opens the right child route. | | |
| 1.3 | If your session uses `facilityId` (and optionally `organizationId` in the URL), clicking each card **preserves** those query params. | | |
| 1.4 | The **Activity** log is reachable (footer, secondary link, or as documented in your app). | | |
| 1.5 | No console errors on load. | | |

## If something fails

- Missing query params: check `lib/admin-nav-context` usage and the admin URL hook behavior for client navigation.
- Wrong number of cards: see `app/admin/settings/page.tsx` and product spec for the intended six (plus activity discoverability).

## Next guide

- [02-community-profile.md](./02-community-profile.md)
