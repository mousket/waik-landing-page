# Task 00f — Role-Based Routing After Sign-In
## Phase: 0.5 — Post-Authentication Routing
## Estimated Time: 1–2 hours
## Depends On: task-00a (models), task-00b (super admins), task-00e (middleware)

---

## Why This Task Exists

Right now, everyone who signs in lands on the same URL. Clerk's
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL in .env.local points to a single
destination. That works for a single-role app. WAiK has three distinct
post-login destinations:

  - Super admin (Gerard, Scott) → /waik-admin
  - Admin-tier roles (administrator, DON, head_nurse, owner) → /admin/dashboard
  - Staff roles (rn, lpn, cna, staff, physical_therapist, dietician) → /staff/dashboard

This task creates a single routing page that reads the authenticated user's
role from Clerk publicMetadata and immediately redirects them to the correct
destination. It is invisible to the user — they sign in and land where they
belong with no extra step.

This is also where mustChangePassword is checked one final time before
the user reaches their dashboard. If true, they go to /change-password
instead of their dashboard, regardless of role.

---

## Context Files

- `lib/auth.ts` — getCurrentUser() with role and isWaikSuperAdmin
- `lib/permissions.ts` — permission helpers
- `middleware.ts` — already handles auth enforcement
- `.env.local` — NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL needs updating

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL changed to /auth/redirect
- [ ] app/auth/redirect/page.tsx exists
- [ ] Signing in as gerard@waik.care → lands on /waik-admin
- [ ] Signing in as administrator role → lands on /admin/dashboard
- [ ] Signing in as director_of_nursing → lands on /admin/dashboard
- [ ] Signing in as head_nurse → lands on /admin/dashboard
- [ ] Signing in as rn → lands on /staff/dashboard
- [ ] Signing in as lpn → lands on /staff/dashboard
- [ ] Signing in as cna → lands on /staff/dashboard
- [ ] Signing in as physical_therapist → lands on /staff/dashboard
- [ ] Signing in as dietician → lands on /staff/dashboard
- [ ] User with mustChangePassword: true → lands on /change-password regardless of role
- [ ] Unauthenticated user hitting /auth/redirect → redirected to /sign-in
- [ ] No redirect loop under any combination of role and flags
- [ ] Loading state visible during redirect (not a blank flash)

---

## Test Cases

```
TEST 1 — Super admin routes correctly
  Action: Sign in as gerard@waik.care
  Expected: Final destination is /waik-admin
  Pass/Fail: ___

TEST 2 — Administrator routes correctly
  Action: Sign in as user with roleSlug: "administrator"
  Expected: Final destination is /admin/dashboard
  Pass/Fail: ___

TEST 3 — Director of Nursing routes correctly
  Action: Sign in as user with roleSlug: "director_of_nursing"
  Expected: Final destination is /admin/dashboard
  Pass/Fail: ___

TEST 4 — RN routes correctly
  Action: Sign in as user with roleSlug: "rn"
  Expected: Final destination is /staff/dashboard
  Pass/Fail: ___

TEST 5 — CNA routes correctly
  Action: Sign in as user with roleSlug: "cna"
  Expected: Final destination is /staff/dashboard
  Pass/Fail: ___

TEST 6 — mustChangePassword intercepted before role redirect
  Action: Sign in as any user with mustChangePassword: true
  Expected: Final destination is /change-password
            Role-based redirect does NOT execute
  Pass/Fail: ___

TEST 7 — Unknown role falls back safely
  Action: Sign in as user with a roleSlug not in the known list
  Expected: Falls back to /staff/dashboard (safe default)
            No error thrown, no infinite redirect
  Pass/Fail: ___

TEST 8 — Unauthenticated user blocked
  Action: Navigate directly to /auth/redirect without signing in
  Expected: Redirected to /sign-in by middleware
  Pass/Fail: ___

TEST 9 — No blank flash during redirect
  Action: Sign in as any user, watch the /auth/redirect page
  Expected: Brief WAiK loading indicator visible,
            not a blank white page during redirect
  Pass/Fail: ___

TEST 10 — Direct navigation still works after routing is set up
  Action: While signed in as rn, navigate directly to /staff/dashboard
  Expected: Page loads normally — routing page is only used post sign-in
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14 with ClerkJS. I need a post-sign-in
routing page that reads the user's role and redirects them to the
correct dashboard. This page is invisible to users — they pass through
it in under 200ms and land where they belong.

STEP 1 — UPDATE .env.local

Change:
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/staff/dashboard

To:
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/redirect

STEP 2 — CREATE app/auth/redirect/page.tsx

This is a server component that:
1. Calls getCurrentUser() from lib/auth.ts
2. Checks mustChangePassword — if true, redirect("/change-password")
3. Checks isWaikSuperAdmin — if true, redirect("/waik-admin")
4. Checks role.isAdminTier — if true, redirect("/admin/dashboard")
5. Default: redirect("/staff/dashboard")

The routing logic in priority order:
  if (!currentUser) → redirect("/sign-in")
  if (currentUser.mustChangePassword) → redirect("/change-password")
  if (currentUser.isWaikSuperAdmin) → redirect("/waik-admin")
  if (currentUser.isAdminTier) → redirect("/admin/dashboard")
  default → redirect("/staff/dashboard")

While the server component resolves (before redirect fires),
render a minimal loading state so there is no blank flash:

  A full-screen div with background color #EEF8F8 (WAiK light bg)
  Centered content:
    WAiK wordmark in #0D7377 (teal), bold, large
    Below it: a simple animated loading indicator
    (three dots pulsing, or a thin teal progress bar across the top)
  No other content — this screen is seen for under 200ms

The component structure:
  - Outer div: full screen, background #EEF8F8, flex center
  - Inner div: text center
    - <p> "WAiK" in teal, text-4xl, font-bold
    - Loading dots or spinner below

Use Tailwind classes for styling. Use next/navigation redirect()
for the server-side redirects.

STEP 3 — ADD auth/redirect TO MIDDLEWARE PUBLIC ROUTES

In middleware.ts, ensure /auth/redirect is NOT in the public routes list.
It requires authentication — unauthenticated users should be caught by
middleware and sent to /sign-in before this page even loads.

STEP 4 — HANDLE EDGE CASE: USER EXISTS IN CLERK BUT NOT IN MONGODB

In getCurrentUser(), if the Clerk session exists but no UserModel document
is found for that clerkUserId:
  - This means the user was created in Clerk but the MongoDB document
    was not created (race condition or manual Clerk dashboard creation)
  - Return null — do not throw
  - The redirect page should handle null currentUser by redirecting to /sign-in
  - Log a warning: console.warn("Clerk user exists but no MongoDB record found:", clerkUserId)

STEP 5 — CREATE A REUSABLE REDIRECT LOADING COMPONENT

Create components/ui/redirect-loading.tsx:
  A simple component showing the WAiK wordmark and loading indicator.
  Props: message?: string (optional subtitle, default: "Loading your dashboard...")
  
  This component is also used on:
  - /change-password while the password update processes
  - Any other transition screens that need a loading state

After implementation: run npm run build and fix any TypeScript errors.
Do not touch any existing dashboard pages, API routes, or auth configuration
beyond the .env.local change specified above.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/02-ONBOARDING-FLOW.md` — add routing diagram
- Create `plan/pilot_1/phase_0.5/task-00f-DONE.md`
