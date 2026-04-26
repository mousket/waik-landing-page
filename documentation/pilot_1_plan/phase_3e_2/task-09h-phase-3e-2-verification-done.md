# 09h — Phase 3e.2 integration verification (DONE)

**Date:** 2026-04-26

## Automated gate (09g + 09h)

- **`npm run typecheck`** — passes (`tsc --noEmit`); fixes landed for offline queue narrowing (`postIncidentOrQueue` consumers), `app/sw.ts` service worker types, and related issues.
- **`npm run lint:ci`** — passes (`tsc` + `eslint . --max-warnings 0`). See `task-09g-eslint-ci-signal-done.md` for ESLint policy.
- **`npm run build`** — successful (Next.js 14.2.35) on the integration branch for this work.

## Manual QA (09a checklist) — for humans

Run once per meaningful UI release:

1. **Sign in** (Clerk) on a real account with staff + admin access.
2. **Staff:** open **Staff dashboard** — confirm background wash, cards, and primary CTA look consistent; touch targets feel comfortable on a phone.
3. **Incidents:** start or open **one incident create flow** (e.g. staff report or beta create) through at least one step — no layout break, no unreadable text.
4. **Admin:** open **Admin dashboard** with facility context in the URL — bottom nav and tabs work; no missing `facilityId` on navigation (regression of Phase 3e scope).

Optional: load **`/offline`** (or simulate offline) to confirm the light “disconnected” screen and queue list still read clearly.

**Pass criteria:** No broken hierarchy, no illegible contrast, no obviously inconsistent primary actions. Pixel-perfect match to mockups is not required.

## Notes

- Routing and **admin facility rules** were not changed as part of 09g/09h; only tooling, typings, and lint configuration were updated alongside the verification doc refresh.
