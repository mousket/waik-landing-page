# Task 10a — Runtime stabilization (Clerk + React runtime)

## Status: **DONE** (2026-04-26)

## Purpose

Unblock development on **Next.js 15** by eliminating dev-time runtime crashes (red error overlay) related to Clerk provider + React runtime.

---

## Context

Observed runtime errors (dev overlay):
- `Cannot read properties of undefined (reading 'call')` (stack near `app/layout.tsx` / `ClerkProvider`)
- `Cannot read properties of undefined (reading 'ReactCurrentDispatcher')` (stack includes `components/conditional-root-header.tsx`)

Known current state:
- `components/clerk-root-provider.tsx` exists as a client wrapper.
- `app/layout.tsx` uses `ClerkRootProvider`.

---

## Constraints

- Do not redesign UI.
- Prefer minimal diffs that restore runtime stability.
- Keep Next.js on **15.x**.

---

## Tasks

### A) Remove obvious runtime instability vectors

- [ ] Clear `.next` and restart dev server
- [ ] Confirm the error still reproduces (record route + stack summary)

### B) Make Clerk provider App Router–safe

- [ ] Ensure `ClerkProvider` is only instantiated inside a **client** component (`ClerkRootProvider`)
- [ ] Fix typings in `components/clerk-root-provider.tsx` (use Clerk’s `Appearance` type; no `unknown`)
- [ ] If runtime errors persist: bump `@clerk/nextjs` to a Next 15–compatible release (keep React 18)

### C) Validate core auth UX

- [ ] Signed out: header shows sign-in UI where expected (non-admin/staff)
- [ ] Signed in: `UserButton` renders without crashing
- [ ] `/admin/dashboard` renders without runtime overlay

---

## Files to start with

- `app/layout.tsx`
- `components/clerk-root-provider.tsx`
- `components/conditional-root-header.tsx`
- `package.json` / `package-lock.json`

---

## Verification

Run in order:

```bash
rm -rf .next
npm run dev
```

Manual:
- Open `/admin/dashboard`
- Navigate to a non-admin route (any that uses the root header bar)
- Sign in/out at least once

---

## Done criteria

- No red runtime overlay on `/admin/dashboard` during dev.
- No runtime crashes on initial load or client navigation for signed-in and signed-out states.

## Outcome

- Dev server is stable on Next 15 after clearing `.next`.
- Unauthenticated route smoke confirmed no runtime overlay / TypeError when hitting `/admin/dashboard` (redirects to Clerk sign-in as expected).
- Signed-in flow (sign in/out + `SignedIn` / `SignedOut` rendering) was not exercised in this pass (requires real credentials).

