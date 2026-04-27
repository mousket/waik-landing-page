# 06 — Staff management (`/admin/settings/staff`)

## Purpose

Phase 5 Task 10: the **community** owns the roster. This guide covers **list**, **invite**, **pending invitations**, **role changes**, and **deactivation** within your permission rules (e.g. DON may not create admin-tier roles, depending on policy). Use it to show that WAiK does not require WAiK staff for day-to-day adds and moves.

## Who and when

- **Persona:** Community admin with “invite staff” permission (or your matrix equivalent).
- **When:** New hire, role change, offboarding, or a demo of the manual onboarding story.

## How to get there

- **`/admin/settings/staff`**
- If your admin app requires **facility in the URL**, keep `?facilityId=…` while testing so the list and APIs are scoped.

## What to look for (demo talk track)

- A **read-only** table (or list) of users for the current facility: name, email, role, status.
- **Invite** flow: email, role selection, success feedback, and a **pending invitations** list with cancel/resend as implemented.
- **Edit role** modal (or inline) and **deactivate** / reactivate, respecting **role gates** (e.g. error or disabled state when a role is not allowed for that actor).

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 6.1 | **Staff list** loads for the effective facility. | | |
| 6.2 | **Invite** sends a Clerk (or your) email to a test address; you see a **pending** entry. | | |
| 6.3 | **Cancel** removes a pending invite (or marks it cancelled). | | |
| 6.4 | **Resend** (if present) issues another email without duplicating the wrong row. | | |
| 6.5 | **Edit role** to an allowed value succeeds; to a **forbidden** role fails clearly (if you test a restricted actor). | | |
| 6.6 | **Deactivate** revokes app access; **reactivate** restores, per your app. | | |
| 6.7 | `RoleGate` or route protection hides actions for users who should not see them. | | |

## If something fails

- Check `/api/admin/staff` and org/facility resolution for the current admin.
- For Clerk, confirm the invitation template and that the **same** Mongo `facilityId` is attached to the new user on first login.

## Next guide

- [07-activity-log.md](./07-activity-log.md)
