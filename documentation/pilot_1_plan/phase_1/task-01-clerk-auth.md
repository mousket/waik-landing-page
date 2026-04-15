# Task 01 — Install ClerkJS + Multi-Tenant Auth Foundation
## Phase: 1 — Foundation & Auth
## Estimated Time: 4–6 hours
## Depends On: nothing — this is the first task

---

## Why This Task Exists

The current auth system (`lib/auth-store.ts`) stores userId and role in
localStorage via Zustand persist. API routes trust whatever userId is passed
in the request body — there is no server-side verification. Any user can call
any endpoint and impersonate any other user.

This is the single biggest disqualifier for a real pilot. It must be fixed
before any other work begins.

---

## Context Files

Read these before starting:
- `lib/auth-store.ts` — the file being replaced
- `app/api/auth/login/route.ts` — the file being replaced
- `app/layout.tsx` — needs ClerkProvider wrapper
- `middleware.ts` — create this file (does not exist yet)
- `lib/types.ts` — UserRole type needs expansion
- All files under `app/api/` — every route needs getCurrentUser() added

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors after this task
- [ ] Visiting `/staff/dashboard` without being logged in redirects to `/sign-in`
- [ ] Visiting `/admin/dashboard` without being logged in redirects to `/sign-in`
- [ ] Calling `GET /api/incidents` without an Authorization header returns `401`
- [ ] `getCurrentUser()` returns `{ userId, orgId, facilityId, role, name, isWaikSuperAdmin }`
- [ ] A user with role `rn` is redirected to `/staff/dashboard` after sign-in
- [ ] A user with role `administrator` is redirected to `/admin/dashboard` after sign-in
- [ ] `lib/auth-store.ts` is deleted
- [ ] `app/api/auth/login/route.ts` is deleted
- [ ] `lib/google-sheets.ts` is deleted
- [ ] `ClerkProvider` wraps the root layout

---

## Test Cases

Run each of these after the implementation is complete:

```
TEST 1 — Unauthenticated redirect
  Action: Visit /staff/dashboard in a fresh browser (no session)
  Expected: Redirect to /sign-in
  Pass/Fail: ___

TEST 2 — Admin route protection
  Action: Visit /admin/dashboard in a fresh browser
  Expected: Redirect to /sign-in
  Pass/Fail: ___

TEST 3 — API route protection
  Action: curl -X GET http://localhost:3000/api/incidents
  Expected: { "error": "Unauthorized" } with status 401
  Pass/Fail: ___

TEST 4 — Role-based redirect after sign-in
  Action: Sign in with a user whose publicMetadata.role === "rn"
  Expected: Redirected to /staff/dashboard
  Pass/Fail: ___

TEST 5 — Admin role redirect
  Action: Sign in with a user whose publicMetadata.role === "administrator"
  Expected: Redirected to /admin/dashboard
  Pass/Fail: ___

TEST 6 — getCurrentUser() returns correct shape
  Action: Add a console.log(await getCurrentUser()) to any API route and call it
  Expected: { userId: string, orgId: string, facilityId: string, role: string, name: string, isWaikSuperAdmin: boolean }
  Pass/Fail: ___

TEST 7 — requireRole blocks wrong role
  Action: Call an admin-only API route with a staff-role user token
  Expected: 403 Forbidden
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building a Next.js app (App Router) called WAiK. I need to replace the existing custom Zustand auth store with ClerkJS for production-grade multi-tenant authentication.

CURRENT STATE:
- lib/auth-store.ts uses Zustand + persist to store userId, username, role, name in localStorage
- API routes have no auth middleware — they trust userId passed in request body/query
- Two roles only: "staff" | "admin"
- app/api/auth/login/route.ts does manual bcrypt comparison against MongoDB

WHAT I NEED:

1. Install and configure ClerkJS with Organizations for multi-tenancy:
   npm install @clerk/nextjs

2. Create middleware.ts at the project root:
   - Protect all routes under /staff/*, /admin/*, /api/incidents/*, /api/agent/*, /api/assessments/*, /api/residents/*
   - Public routes: /, /sign-in/*, /sign-up/*, /api/push/*, /offline
   - Use clerkMiddleware() with createRouteMatcher

3. Define the role hierarchy using Clerk's publicMetadata on each user:
   {
     facilityId: string,
     orgId: string,
     role: "owner" | "administrator" | "director_of_nursing" | "head_nurse" | "rn" | "lpn" | "cna" | "staff" | "physical_therapist" | "dietician",
     facilityName: string,
     isWaikSuperAdmin: boolean
   }

   Admin roles (can access /admin/*): owner, administrator, director_of_nursing, head_nurse
   Staff roles (access /staff/* only): rn, lpn, cna, staff, physical_therapist, dietician

4. Create lib/auth.ts with these exports:
   - getCurrentUser() — returns { userId, orgId, facilityId, role, name, isWaikSuperAdmin } from Clerk session
   - requireRole(allowedRoles: string[]) — throws 401/403 if not authenticated or wrong role
   - requireFacilityAccess(facilityId: string) — throws 403 if user not in that facility
   - isAdminRole(role: string) — returns true for admin-tier roles
   - canAccessPhase2(role: string) — returns true for director_of_nursing, administrator, owner

5. Create app/sign-in/[[...sign-in]]/page.tsx using Clerk's <SignIn /> component
   - Style to match WAiK teal (#0D7377) and dark (#0A3D40) color scheme
   - After sign-in, redirect based on role: admin roles → /admin/dashboard, staff roles → /staff/dashboard

6. Update app/layout.tsx to wrap with <ClerkProvider>

7. Update ALL existing API routes to call getCurrentUser() at the top and return 401 if not authenticated

8. Remove lib/auth-store.ts and app/api/auth/login/route.ts after confirming Clerk works

9. Remove lib/google-sheets.ts entirely — data leak risk

DO NOT change any MongoDB models, agent logic, or UI components yet.
```

---

## Post-Task Documentation Update

After this task passes all test cases, update:
- `documentation/waik/01-SYSTEM-OVERVIEW.md` — add ClerkJS auth section
- `documentation/waik/03-API-REFERENCE.md` — note that all routes now require Bearer token
- Create `plan/pilot_1/phase_1/task-01-DONE.md` with summary of what was built
