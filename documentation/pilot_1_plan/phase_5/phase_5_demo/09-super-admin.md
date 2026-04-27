# 09 — WAiK super admin (`/waik-admin`)

## Purpose

**Pilot and platform oversight** for WAiK operators only: a **platform-style** home with organization and facility intelligence, and an **all-facilities** view with a fixed set of **columns** plus a **per-facility** deep-dive (usage metrics, staff, pilot feedback, recent incidents). This must **not** be exposed to community admins.

## Who and when

- **Persona:** A user with **`isWaikSuperAdmin`** in Mongo (and Clerk) — **not** a site DON.
- **When:** Executive pilot review, weekly “how are the sites doing?” or debugging a site without shell access to Mongo.

## How to get there

- Sign in as the **super admin** test user.
- Open **`/waik-admin`**, then a facility: **`/waik-admin/{facilityId}`** (e.g. click a facility name in the table).

## What to look for (demo talk track)

- **Home:** overview stats, organizations, and a **pilot** narrative (counts and “new organization” style actions if in scope for your run).
- **All facilities** table: **8 columns** — Name, Type, State, Staff, Incidents (30d), Avg completeness, Last activity, Plan. Row **names** link to the **deep-dive** page.
- **Deep-dive** (`/waik-admin/[facilityId]`): high-level **metrics**, **staff** engagement, **pilot feedback** (average, count, recent comments if any), and **recent incidents** (summary, not full PHI dump).
- **Access control:** sign in as a **non–super-admin** (community admin). Visiting **`/waik-admin`** must show a **generic** “no permission” style screen — **not** a detailed 404 or a leak of internal route names.

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 9.1 | As **super admin**: `/waik-admin` loads with the **all facilities** table. | | |
| 9.2 | The table has exactly **8** data columns in the right order. | | |
| 9.3 | A **name** link opens the facility deep-dive. | | |
| 9.4 | Deep-dive shows **metrics** + **staff** + **feedback** + **recent incidents**. | | |
| 9.5 | As **normal admin** (or staff): `/waik-admin` is **blocked** with a neutral message. | | |
| 9.6 | No PII in error messages; no stack trace to the browser. | | |

## If something fails

- Compare API responses: `GET /api/waik-admin/communities` and `GET /api/waik-admin/communities/[facilityId]`.
- Confirm the user’s **Mongo** and **Clerk** flags match the `requireWaikSuperAdmin` gate in your code.

## Next guide

- [10-accept-invite.md](./10-accept-invite.md)
