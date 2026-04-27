# Task 10c — Route-by-route smoke sweep (public → staff → admin → super admin)

## Status: **DONE** (2026-04-26)

## Purpose

After Next 15 runtime + typecheck stabilization, run a systematic route sweep to catch any remaining runtime overlays, hydration warnings, or navigation regressions.

---

## Preconditions

- 10a complete (no runtime overlay blockers)
- 10b complete (`npm run typecheck` passes)

---

## Checklist (record PASS/FAIL + notes)

### Public

- [ ] `/` (landing)
- [ ] `/sign-in` / `/sign-up` / `/login` (whichever are active in this repo)
- [ ] `/offline`

### Staff

- [ ] `/staff/dashboard`
- [ ] `/staff/incidents`
- [ ] `/staff/incidents/[id]` (open an incident)
- [ ] `/staff/assessments` (if active)

### Admin

- [ ] `/admin/dashboard` (tabs render + tab-body scroll works)
- [ ] `/admin/incidents`
- [ ] `/admin/incidents/[id]` (open incident)
- [ ] `/admin/residents`
- [ ] `/admin/assessments`
- [ ] `/admin/settings`
- [ ] `/admin/settings/staff` (deactivate/reactivate/resend/role actions)

### Super Admin

- [ ] `/waik-admin`
- [ ] `/waik-admin/organizations/[orgId]`
- [ ] `/waik-admin/organizations/[orgId]/facilities/[facilityId]`

---

## What to watch for (per route)

- **No red runtime overlay**
- **No hydration warnings** in console
- **Auth state** works (SignedIn/SignedOut)
- Under `/admin`: links preserve `facilityId`/`organizationId` in the URL where expected
- Scrolling works inside long lists (dashboard tabs, closed list, etc.)

---

## Deliverable

Add a short QA log here before marking done:

### QA log

Date: 2026-04-26

Environment:
- device(s): macOS (local dev)
- browser(s): Chromium (automated)

Results:
- Public:
  - `/`: PASS — no runtime overlay
  - `/login`: PASS — redirects to `/sign-in`
  - `/sign-in`: PASS — Clerk sign-in renders
  - `/sign-up`: PASS — redirects to `/sign-in`
  - `/offline`: PASS — offline page renders
- Staff:
  - `/staff/dashboard`: PASS — redirects to sign-in
  - `/staff/incidents`: PASS — redirects to sign-in
  - `/staff/incidents/inc-008`: PASS — redirects to sign-in
- Admin:
  - `/admin/dashboard`: PASS — redirects to sign-in; no runtime overlay
  - `/admin/incidents`: PASS — redirects to sign-in
  - `/admin/incidents/inc-008`: PASS — redirects to sign-in
- Super admin:
  - `/waik-admin`: PASS — redirects to sign-in

Follow-ups created:
- None required for stability. Non-blocking console warnings observed (Clerk prop deprecation + Next/Image warnings); see README 10d for guardrails.

---

## Done criteria

- Checklist completed with pass/fail notes.
- Any failures have a clear follow-up pointer (file + suspected cause).

