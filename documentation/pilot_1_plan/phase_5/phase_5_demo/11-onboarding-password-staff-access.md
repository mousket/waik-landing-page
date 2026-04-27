# 11 — Onboarding tour, password gate, and staff access

## Purpose

This file bundles **three** final Phase 5 behaviors that affect **first run** and **separation of roles**:

1. **Onboarding (4 steps)** on **admin** and **staff** dashboards, shown **once** per role until `localStorage` is cleared.  
2. **Must-change-password**: middleware + APIs block normal use until the user finishes **`/change-password`**, then the Mongo flag (and usually Clerk public metadata) clears.  
3. **Staff** (non-admin) can use **`/staff/*`** and sees **staff** onboarding, but should **not** get usable access to **community admin** or **super admin** surfaces.

Use this guide after invite acceptance, or in dedicated test accounts.

---

## A — Dashboard onboarding (admin and staff)

### How it works in the product

- After landing on the **admin** or **staff** home, a small **card** in the **bottom-right** can appear with “**1 of 4**” style steps, **Next**, **Skip**, and **Got it** on the last step.
- Keys: `waik:hasSeenOnboarding:admin` and `waik:hasSeenOnboarding:staff` in **localStorage** (origin-specific).

### Manual test checklist (onboarding)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 11.1a | New browser profile (or after deleting localStorage): visit **`/admin/dashboard`** — tour can appear. | | |
| 11.1b | Complete the tour; **reload** — tour does **not** reappear. | | |
| 11.1c | Repeat for **`/staff/dashboard`** with a **staff** user (tour is specific to the **staff** key). | | |
| 11.1d | **Skip** on step 1 still sets storage so the tour does not reappear. | | |

**To re-demo:** In DevTools → Application → Local Storage, remove the keys for your origin.

---

## B — `mustChangePassword` gate

### How it works in the product

- A **Mongo** user flag (and may mirror in Clerk) forces **`/change-password`** before any protected app route or data API, except exempted paths (sign-in, public APIs for flags, the change form itself, etc.).

### Manual test checklist (password)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 11.2a | For a test user, set `mustChangePassword: true` in **Mongo** (or your internal tool) and start a **fresh** session. | | |
| 11.2b | Navigating to **dashboard** redirects to **`/change-password`**. | | |
| 11.2c | **Submit** a valid new password: redirect to the **right** home (admin vs staff), app loads. | | |
| 11.2d | **Mongo** shows `mustChangePassword: false` (and Clerk public metadata if your API updates it). | | |
| 11.2e | **Second** login: **no** forced change. | | |

**Cleanup:** Revert the test user’s password policy if the account is shared.

---

## C — Staff vs admin / super admin access

### What to show in a demo

- **Staff** sees the **voice-first** dashboard and work queues; they do not configure **facility-wide** policy.
- They should be **rejected** or **redirected** if they type **`/admin/settings`**, **`/admin/dashboard`**, or **`/waik-admin`** (exact behavior may be redirect to home, 404, or forbidden, but must not expose admin UIs to unauthorized roles).

### Manual test checklist (staff)

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 11.3a | Sign in as a **non-admin** staff user. | | |
| 11.3b | **Staff** onboarding (first visit) on **`/staff/dashboard`**. | | |
| 11.3c | **`/admin/settings`** and **`/waik-admin`** are **inaccessible** (no full settings shell as community admin, no super admin). | | |
| 11.3d | **Staff** can open assigned incident URLs they need for the job, per your routing rules. | | |

---

## Suggested one-line close (all of Phase 5)

> “We onboard people safely, we separate who configures the building from who works at the bedside, and we only block you when policy requires a new password or the right role.”

---

## Index

- [README.md](./README.md)
