# Task: Install ClerkJS + Multi-Tenant Auth Foundation
## Phase: 1
## Depends On: none
## Estimated Time: 4 hours

## Context Files
- lib/auth-store.ts (replace this)
- middleware.ts (create this)
- app/layout.tsx (update this)
- lib/types.ts (update UserRole)
- lib/auth.ts (create this)
- app/sign-in/[[...sign-in]]/page.tsx (create)

## Success Criteria
- [ ] All /staff/* routes redirect to /sign-in when unauthenticated
- [ ] All /admin/* routes redirect to /sign-in when unauthenticated
- [ ] getCurrentUser() returns { userId, facilityId, role, orgId, name, isWaikSuperAdmin } from Clerk session
- [ ] Two test users (staff + admin) can log in with different roles
- [ ] /api/incidents returns 401 when called without auth header
- [ ] lib/auth-store.ts and app/api/auth/login/route.ts removed
- [ ] lib/google-sheets.ts removed

## Test Cases
- GET /api/incidents with no auth → expect 401
- GET /api/incidents with valid staff token → expect 200 with facilityId-filtered results (after task-02)
- GET /api/incidents with valid admin token → expect 200 with all facility incidents (after task-02)
- POST /api/incidents with staff token + wrong facilityId → expect 403 (after task-02)
- Accessing /admin/dashboard as staff role → expect redirect to /staff/dashboard or 403
- Accessing /staff/dashboard unauthenticated → expect redirect to /sign-in

## Implementation Prompt

```
I'm building a Next.js 14 app (App Router) called WAiK. I need to replace the existing custom Zustand auth store with ClerkJS for production-grade multi-tenant authentication.

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
     isWaikSuperAdmin: boolean  // for Gerard/Scott only
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
   - Style to match WAiK teal/dark color scheme
   - After sign-in, redirect based on role: admin roles → /admin/dashboard, staff roles → /staff/dashboard

6. Update app/layout.tsx to wrap with <ClerkProvider>

7. Update ALL existing API routes to call getCurrentUser() at the top and return 401 if not authenticated

8. Remove lib/auth-store.ts and app/api/auth/login/route.ts after confirming Clerk works

9. Remove lib/google-sheets.ts entirely — data leak risk

DO NOT change any MongoDB models, agent logic, or UI components yet.
```
