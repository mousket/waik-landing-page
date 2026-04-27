# 10 — Accept invite (`/accept-invite`)

## Purpose

Support the **Clerk invitation** story: a first-class landing page with the **pilot or facility name** in the query string, short welcome **copy**, and an embedded **Sign up** (virtual routing) that sends the user to your **post-authentication** route (`/auth/redirect` → role-based home). It complements **Staff management** (where you send the invite) and the **onboarding** tour (which runs on the first dashboard view).

## Who and when

- **Persona:** A **new** user who received an email invite (or a tester in a private window, not already signed in).
- **When:** “Day one” of a new hire, or a demo of the **full invite loop** (invite → sign up → redirect → first login).

## How to get there

- **`/accept-invite?facility=Your%20Community%20Name`**
- Use a **name** the pilot will see in the welcome sentence (URL-encoded spaces are fine in modern browsers).

## What to look for (demo talk track)

- **Branding** (logo, heading) and a line that the user was “invited to {facility}.”
- A **Clerk** sign-up form embedded in the page (`routing="virtual"`), with **Sign in** available for existing accounts if your product allows it.
- After a successful sign-up, the browser should go to your configured **`forceRedirectUrl` / post-auth** URL, then to **`/auth/redirect`**, then to **admin** or **staff** dashboard** based on the Mongo user record, **not** a blank page or a loop to sign-in.
- A footnote that **first sign-in** may require a **password change** (if that is your policy) sets expectations.

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 10.1 | `facility` **query** appears in the welcome string. | | |
| 10.2 | **Sign up** is usable: email verification steps match your Clerk project. | | |
| 10.3 | After sign-up, user lands on **`/auth/redirect`**, then the **correct** home for their **role**. | | |
| 10.4 | If the person already has an account, **Sign in** path works. | | |
| 10.5 | If Mongo user is missing, **`/auth/account-pending`** (or your) appears instead of a redirect loop. | | |
| 10.6 | `mustChangePassword` still routes to `/change-password` if set, before the dashboard. | | |

## Safety

- Do not use real resident PHI in test facility names. Use a generic “Pilot Site A” style name.

## Next guide

- [11-onboarding-password-staff-access.md](./11-onboarding-password-staff-access.md)
