# Phase 5 — Manual demo & test plan

This guide is for **you** (or a pilot champion) to **walk the product like a live demo** and to **verify** Admin Settings, Super Admin, staff management, auth edge cases, and exports. Use it in order for a smooth narrative, or jump to a section for focused QA.

**Per-topic guides (11 files):** see the [`phase_5_demo/`](./phase_5_demo/README.md) folder. Each has its own **purpose**, **URLs**, **talk track**, and **checklist**—use them for deep dives or to split QA across people.

---

## What Phase 5 covers (at a glance)

| Area | Primary URLs |
|------|----------------|
| Settings hub | `/admin/settings` |
| Community profile & reporting window | `/admin/settings/profile` |
| Incidents: phase mode, thresholds, gold standards, custom types | `/admin/settings/incidents` |
| Staff (invite, roles, deactivate) | `/admin/settings/staff` |
| Activity log | `/admin/settings/activity` (linked from settings footer) |
| Notification preferences | `/admin/settings/notifications` |
| CSV export | `/admin/settings/export` |
| Help & facility ID | `/admin/settings/help` |
| Super Admin (pilot org + all facilities) | `/waik-admin`, `/waik-admin/[facilityId]` |
| Invite acceptance (embedded sign-up) | `/accept-invite` |
| Forced password change | `/change-password` (when `mustChangePassword` is true) |

---

## Prerequisites

1. **App running** — e.g. `npm run dev` (or your deployed preview URL).
2. **Environment** — Same `MONGODB_URI` and Clerk keys you use for real data; confirm `.env` matches the DB you expect to show in the UI.
3. **Browsers** — One normal window for the “community admin” story; optionally an incognito window for a second persona (or a second user).
4. **Optional: clearing onboarding** — If you want to see the 4-step dashboard tour again, remove these keys in DevTools → Application → Local Storage (for your origin):
   - `waik:hasSeenOnboarding:admin`
   - `waik:hasSeenOnboarding:staff`

---

## Accounts to prepare

| Persona | Purpose |
|--------|--------|
| **Community admin** (admin tier, `facilityId` set) | Settings, staff, exports, incidents list — full Phase 5 path. |
| **Staff (non-admin)** | Staff dashboard, onboarding (staff), cannot access `/admin/*` or `/waik-admin`. |
| **WAiK super admin** (`isWaikSuperAdmin` in DB) | `/waik-admin` facility table and deep-dive only. |
| **User with `mustChangePassword: true` in Mongo** (and session) | Middleware should send you to `/change-password` before dashboards load. |

If you do not have a second browser profile, you can still demo most flows in sequence by signing out and back in as different test users.

---

## Recommended 20-minute demo script (narrative order)

A single presenter can use this as a **talk track**. Check each step as you go.

1. **Land as community admin** — Open `/auth/redirect` after sign-in, or go straight to `/admin/dashboard` if already signed in.
2. **Onboarding (first time only)** — You should see a small card (bottom-right) with “1 of 4” steps. Click **Next** through 4 steps or **Skip**. Reload the dashboard: the tour should **not** reappear.
3. **Settings hub** — Go to `/admin/settings`. Call out **six** cards: Profile, Incidents, Staff, Notifications, Export, Help. Mention **Activity** in the footer (Task 10).
4. **Community profile** — `/admin/settings/profile`: show facility fields and **mandated reporting window**; save, reload, confirm persistence.
5. **Incident configuration** — `/admin/settings/incidents`: two-phase switch (show confirmation when changing to single-phase), per-type **thresholds** (try an invalid value if you want), **Gold standards** dialog (defaults + custom), custom incident types if seeded.
6. **Notifications** — `/admin/settings/notifications`: per built-in type, **when started** / **when Phase 1 signed**; save and reload. Point out the **read-only** PHI / device guidance text.
7. **Data export** — `/admin/settings/export`: default **off** for names; toggle **on** and confirm the **PHI** acknowledgment dialog, then open each export (incidents, assessments, residents) and spot-check the downloaded CSV in a text editor.
8. **Staff** — `/admin/settings/staff`: list, invite flow (or describe pending invites), role edit / deactivate *if* policy allows in your org.
9. **Activity (optional)** — `/admin/settings/activity`: filters and recent events.
10. **Super Admin** — Sign in as **super admin**. Open `/waik-admin`: platform stats, then **All facilities** (8 columns, name links). Click a facility → `/waik-admin/[facilityId]`: metrics, staff table, feedback, recent incidents. Sign out; sign in as a **normal** admin and confirm `/waik-admin` shows a **generic** no-permission screen (no route or internal details).
11. **Accept invite (story only)** — Open `/accept-invite?facility=Your%20Pilot%20Name` (unauthenticated or in a private window). Show welcome copy and embedded **Sign up**; after account creation, user should follow Clerk → `/auth/redirect` → correct dashboard, then one-time **onboarding** as in step 2.
12. **Password change gate (if test user exists)** — As a user with `mustChangePassword`, confirm you land on `/change-password`, complete the form, then land on the right dashboard; second login should not force change.

---

## Detailed checklists (pass / fail / notes)

Use the **Notes** column for URLs, user ids, or screenshots to file.

### A — Settings home (`/admin/settings`)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| A1 | Exactly **six** cards, links work with `facilityId` / `organizationId` in the URL as applicable. | | |
| A2 | Activity link in footer (if present) goes to activity log. | | |

### B — Profile (`/admin/settings/profile`)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| B1 | Save **mandated reporting** hours; toast or success; reload shows same value. | | |
| B2 | Other profile fields (contact, state, etc.) match your spec for the pilot. | | |

### C — Incident configuration (`/admin/settings/incidents`)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| C1 | Toggling **off** two-phase opens a **confirmation** with clear copy before the mode flips. | | |
| C2 | “Keep two-phase” dismisses without changing (or reverts) as designed. | | |
| C3 | Thresholds only accept **60–95%** (or show validation). | | |
| C4 | Gold standards UI lists **default** line items; **add custom** field path works. | | |
| C5 | Custom incident types save. | | |

### D — Notifications (`/admin/settings/notifications`)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| D1 | Each built-in type has **when started** and **when Phase 1 signed** blocks. | | |
| D2 | Save; hard reload; toggles match. | | |
| D3 | Page documents **personal vs work device** / PHI behavior (read-only is fine for demo). | | |

### E — Export (`/admin/settings/export`)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| E1 | With names **off**, incident CSV has **room** and **no** `residentName` column (or equivalent). | | |
| E2 | Turning names **on** forces **acknowledgment** first. | | |
| E3 | `days` window affects incident/assessment exports as expected. | | |

### F — Staff & activity (Task 10)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| F1 | Staff list loads for the current facility. | | |
| F2 | Invite (or at least “pending” state) matches your process. | | |
| F3 | Activity log shows expected **event types** and **filters** work. | | |

### G — Super Admin

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| G1 | Non-super user: `/waik-admin` is **blocked** with a **neutral** message. | | |
| G2 | Super user: **All facilities** table shows **8** columns: Name, Type, State, Staff, Incidents (30d), Avg completeness, Last activity, Plan. | | |
| G3 | Facility name opens deep-dive; **metrics**, **staff**, **feedback**, **recent incidents** look sane. | | |

### H — Auth & first-run

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| H1 | `/accept-invite?facility=...` shows welcome + **Sign up** path to your post-auth URL. | | |
| H2 | Admin / staff **onboarding** (4 steps) runs **once** per role until storage cleared. | | |
| H3 | `mustChangePassword` user cannot use app until **Change password** completes; then Mongo flag is cleared. | | |

### I — Staff role (separate pass)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| I1 | Staff user sees **staff** onboarding (once) on `/staff/dashboard`. | | |
| I2 | Staff cannot open `/admin/settings` or `/waik-admin` (expect redirect or 403, per your app). | | |

---

## After the demo

- [ ] **Export**: Archive sample CSVs if needed for compliance review (PHI if names on).
- [ ] **Data**: Revert any **phase mode** or **threshold** changes you made for testing if the DB is shared.
- [ ] **Clerk / Mongo**: Revert `mustChangePassword` test user if you toggled it manually.
- [ ] **Follow-up**: Log failures in your issue tracker with the **#** and letter from the tables above (e.g. E2, G2).

---

## Suggested one-line “demo close” (optional)

> “In one place, the community controls how incidents behave, who gets nudged, and what leaves the building in a CSV—without calling us, and for pilot oversight we can open one screen per facility to see use and feedback.”

That lines up with Phase 5’s intent: **self-service admin** plus **WAiK visibility** for the pilot.
