# Staff experience — how to test Phase 5b (what to expect)

This guide is for **staff-role** users (for example the seed RN **Maria Torres**). Use a **dev environment** with `npm run dev`, a configured database, and (if you use the seed script) data from `scripts/seed-dev.ts`.

**Suggested sign-in (seed):** `m.torres@sunrisemn.com` — password printed when you run the seed (default documented in that script). For a **fuller staff dashboard** (many open reports, to-complete, and due assessments tied to you), also seed **Gerard** / **Mousket** Beaubrun: `gerardbeaubrun@yahoo.com` and `mousket.beaubrun@yahoo.com` (see `scripts/seed-dev.ts` and run `npx tsx` / `npm run` seed as you usually do for dev).

---

## 1. Role routing

- After login, you should land on the **staff** home (`/staff/dashboard` or the path your `app/auth/redirect` logic uses for the `staff` role).
- Hitting an **admin-only** URL as staff should be blocked or redirected, depending on your middleware; do not expect the full admin app shell for this persona.

---

## 2. Staff dashboard (`/staff/dashboard`)

**What to look for**

- **Top navigation (desktop)**: same pattern as `AdminAppShell` — logo left, **centered text links** (Dashboard, Incidents, Assessments, Residents, Intelligence) with a **teal underline** on the active route, user menu right. On **mobile** the center nav is hidden; use the **bottom tab bar** (thumb zone) like admin.
- **Scroll**: the app uses **`h-dvh` + a single scroll region** under the header (`overflow-y-auto`, `min-h-0` chain) so the full dashboard, including the sidebar, scrolls smoothly on small screens and desktop.
- **Admin-aligned layout** (same `max-w-[1600px]` + gradient page wash as the admin command center): main column on the left, a **right sidebar** (~280px) on large screens, matching `AdminDashboardShell`.
- A **greeting row** like the command center + facility pickers: **“Today on the floor”** + salutation in a **gradient card** on the left, and **“New report”** + **Report incident** in a matched card on the **same row** (stacks on small screens). The primary report CTA is not only in the sidebar.
- A **gradient greeting card** (same family as the admin “Command center” block): staff-oriented subtitle, and **chips** for team/unit, “to answer”, “open” reports, and “assessments due” (tap chips to scroll to work or go to assessments).
- **Pill tabs** in the same style as the admin incident tabs: **Open** (Phase 1 in progress) · **To complete** (pending report questions) · **All my reports** (chronological list) inside a **scrollable** rounded-2xl panel.
- The **sidebar** has **Report incident**, **Your last 30 days** (performance from `/api/staff/performance`), **Shortcuts** (incidents, residents, assessments), and a compact **Assessments due soon** list when data exists.
- The bottom **tab bar** spans the same max width and includes **Home**, **Incidents**, **Residents**, **Assessments**, and **Intelligence** (see `StaffAppShell`).

**Quick checks**

- Reload the page: layout should not overflow the viewport; the main column should scroll if content is long (`min-h-0` + scroll chain per WAiK UI rules).
- Tap through any **“Continue”** CTA on an in-progress card: it should go to the staff incident URL for that incident (see below).

---

## 3. Staff incidents list (`/staff/incidents`)

**What to look for**

- A list you are allowed to see: primarily incidents **you reported** (`staffId` matches you), not the full facility admin list.
- Rows or cards that align with the shared **incident** language (type, room, phase, etc.).

---

## 4. Staff incident detail (`/staff/incidents/[id]`)

**Prerequisite:** you must open an incident **that belongs to you** (for example an incident created from your own report, or a seed incident tied to Maria’s user). Otherwise you may get a forbidden or not-found state by design.

**What to look for**

- A focused **detail** view (tabs or sections) with the **narrative** and current **phase** information appropriate to staff.
- You should **not** get admin-only Phase 2 tools unless your role is elevated in data.

**Quick checks**

- From the dashboard, use **Continue** on a card whose incident id you know; the URL should be `/staff/incidents/<id>`.
- Confirm answers you submit in flows that call `POST` with your session **match** your `userId` where the API enforces that.

---

## 5. Staff residents directory (`/staff/residents`)

**What to look for**

- Search or table of **residents in your facility**.
- Choosing a resident should take you to the **unified profile** (see next section) at `/residents/<residentId>`, not an admin-only URL.

---

## 6. Unified resident profile (`/residents/[id]`)

**What to look for**

- **Same page** for staff and admin, with **role-based** differences: for staff, things like **admin-only notes** filters and **MDS** blocks may be hidden, while an admin (or high-privilege user) sees the full toolset.
- **Incidents** and **notes** use the **pill** language and shared list patterns from the admin resident reference components.
- Navigation from the **admin** `Residents` area should also land here (`/residents/...`); the old admin-only deep link may **redirect** to the unified URL.

**Quick checks (with seed data)**

- Search for **“Margaret”** — you should see **Margaret Chen** with **room 102** and id **`res-001`** (if your DB matches the seed).
- On the **Notes** tab, confirm the **“Admin”** filter for notes is **absent** for a plain staff user.

---

## 7. New incident report (`/staff/report`) — type → resident → draft

This flow was updated so it matches the **dashboard** header styling and so incidents can be **linked to a real resident** before the draft is created.

**Flow**

1. **Screen 1 — Incident type**
   - **Dark teal** header: title **“New Incident Report”**, subtitle **“Select the type of incident”**, **back** control to `/staff/dashboard`.
   - **Four** large cards: Fall, Medication error, Resident conflict, Wound or injury (icons, short descriptions, `min-h-20`).

2. **Screen 2 — Resident**
   - Teal header shows the **type** you chose; **back** returns to type selection.
   - **Resident** search: type a **name** or **room** (e.g. **“Margaret”** or **“102”**). After a short debounce, results should list matches such as **Room 102 — Margaret Chen** (with care level in smaller text).
   - Select a row: a **chip** appears: **“✓ Margaret Chen — Room 102”** (with clear). **Start report** stays disabled until a resident is selected; then it creates the draft and moves to the **Tier 1** dev board.

**What the system does**

- `POST /api/incidents` receives **`residentId`**, **`residentName`**, **`residentRoom`**, and the usual `staffId` / `staffName` / title / description. The new incident in Mongo can store **`residentId`** when present (links to the resident document).
- **Offline:** if the request is queued, you still get the same optimistic navigation with a **toast** about sync when you are back online.

**Quick checks**

- You must be **signed in** with a **facility**; otherwise create incident returns an error and you will see a toast.
- For comparison, **DON/admin** may still have a different landing route; this document describes the **staff** path.

---

## 8. Optional API checks (for debugging)

- `GET /api/auth/user-flags` — should include a **`userId`** the client can use to align answers with the session.
- `POST /api/incidents` — `staffId` in the body must be **your** Clerk id or the API returns **403** (super-admin excepted in code paths that allow it).

---

## 9. If something looks wrong

- **“Doesn’t scroll”:** verify the **staff shell** uses a bounded height (`h-dvh` / `min-h-0` pattern) and the page content scroll area has `min-h-0` + `overflow-y-auto` (see `.cursor/rules/waik-ui-ux-patterns.mdc`).
- **No residents in search:** confirm the facility on your user matches where residents were seeded, and that `GET /api/residents?search=...` returns `200` (network tab).
- **Cannot open another user’s incident on staff:** expected if `getIncidentForUser` restricts by reporter.

This document reflects Phase **5b-01** through **5b-04** (dashboard, staff incident, unified resident, report entry + `residentId`). Heavier **5b-05/5b-06** (full UI token audit, five-tab bar parity, persona checklist) may add more items on top of this.
