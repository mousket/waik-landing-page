# Task 00e — Role-Gated Middleware and Permission Helpers
## Phase: 0 — Platform Identity and Onboarding Infrastructure
## Estimated Time: 2–3 hours
## Depends On: task-00a, task-00b, task-00c, task-00d

---

## Why This Task Exists

The permission helpers in lib/permissions.ts were created in task-00a as
simple functions. This task completes them into a production-ready system:
a React component for client-side role gating, a middleware layer that
enforces authentication and mustChangePassword on every route, and a
centralized API helper that wraps every route handler with the correct
auth checks.

Without this task, every developer (including Cursor) has to manually add
auth checks to every new API route. That is error-prone. With this task,
a single wrapper function handles auth, role checking, and facility scoping
in one line — and the compiler enforces it.

This task also adds the unit selection modal to the staff dashboard —
the flow Scott specified where nurses choose their unit at the start of
each shift.

---

## Context Files

- `lib/permissions.ts` — extend from task-00a
- `middleware.ts` — extend from task-01
- `lib/auth.ts` — getCurrentUser() from task-00a
- `app/staff/dashboard/page.tsx` — add unit selection modal
- `app/staff/layout.tsx` — role gate staff routes
- `app/admin/layout.tsx` — role gate admin routes

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `components/role-gate.tsx` exists and blocks rendering for wrong roles
- [ ] `lib/api-handler.ts` exists with withAuth() and withAdminAuth() wrappers
- [ ] All existing API routes updated to use withAuth() wrapper
- [ ] middleware.ts enforces: unauthenticated → /sign-in
- [ ] middleware.ts enforces: mustChangePassword → /change-password
- [ ] Staff routes (/staff/*) blocked for admin-only roles and vice versa
- [ ] Unit selection modal appears on staff dashboard first load of the day
- [ ] Unit selection stored with date key — does not re-appear same day
- [ ] Unit selection skipped if facility has no units configured
- [ ] Selected unit passed as filter to all dashboard data-fetching calls
- [ ] /waik-admin/* blocked for non-super-admin at middleware level
- [ ] 403 responses never reveal route information to unauthorized users

---

## Test Cases

```
TEST 1 — Unauthenticated user redirected to sign-in
  Action: Navigate to /staff/dashboard without being signed in
  Expected: Redirected to /sign-in
  Pass/Fail: ___

TEST 2 — mustChangePassword intercepted
  Action: Sign in as user with mustChangePassword: true
          Navigate to /staff/dashboard
  Expected: Redirected to /change-password before dashboard loads
  Pass/Fail: ___

TEST 3 — Staff role blocked from admin routes
  Action: Sign in as user with roleSlug: "rn"
          Navigate to /admin/dashboard
  Expected: 403 page
  Pass/Fail: ___

TEST 4 — Admin role blocked from accessing other facility's data
  Action: POST /api/incidents with a facilityId different from user's facilityId
  Expected: 403 Forbidden
  Pass/Fail: ___

TEST 5 — RoleGate blocks rendering
  Action: Render <RoleGate allowedRoles={["administrator"]}> as "rn" user
  Expected: Children not rendered. Fallback shown.
  Pass/Fail: ___

TEST 6 — RoleGate allows rendering
  Action: Render <RoleGate allowedRoles={["rn","lpn"]}> as "rn" user
  Expected: Children rendered normally.
  Pass/Fail: ___

TEST 7 — withAuth wrapper returns 401 for unauthenticated
  Action: Call an API route wrapped with withAuth() without Clerk session
  Expected: 401 { error: "Unauthorized" }
  Pass/Fail: ___

TEST 8 — withAdminAuth returns 403 for staff role
  Action: Call API route wrapped with withAdminAuth() as "cna" user
  Expected: 403 { error: "Forbidden" }
  Pass/Fail: ___

TEST 9 — Unit selection modal appears on first load
  Setup: Facility has units ["Wing A","Wing B"]. Staff has no unit selected today.
  Action: Load /staff/dashboard
  Expected: Unit selection modal appears before dashboard content
  Pass/Fail: ___

TEST 10 — Unit selection not repeated same day
  Action: Select unit "Wing A". Reload dashboard.
  Expected: Modal does not reappear.
  Pass/Fail: ___

TEST 11 — Unit selection skipped when no units configured
  Setup: Facility.units = [] (empty)
  Action: Load /staff/dashboard
  Expected: No modal. Dashboard loads directly.
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task completes the permission and
middleware system and adds the unit selection flow to the staff dashboard.

PART A — API ROUTE WRAPPER

Create lib/api-handler.ts:

type ApiHandler = (req: Request, context: { currentUser: CurrentUser }) => Promise<Response>

export function withAuth(handler: ApiHandler) {
  return async (req: Request, routeContext: any) => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (currentUser.mustChangePassword) {
        return Response.json({ error: "Password change required" }, { status: 403 })
      }
      return handler(req, { ...routeContext, currentUser })
    } catch (error) {
      console.error("API error:", error)
      return Response.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

export function withAdminAuth(handler: ApiHandler) {
  return withAuth(async (req, context) => {
    if (!context.currentUser.isAdminTier) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    return handler(req, context)
  })
}

export function withSuperAdminAuth(handler: ApiHandler) {
  return withAuth(async (req, context) => {
    if (!context.currentUser.isWaikSuperAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    return handler(req, context)
  })
}

export function withFacilityScope(facilityId: string, currentUser: CurrentUser): void {
  if (!currentUser.isWaikSuperAdmin && currentUser.facilityId !== facilityId) {
    throw new FacilityAccessError()
  }
}

class FacilityAccessError extends Error {
  status = 403
  constructor() { super("Forbidden: wrong facility") }
}

Update ALL existing API routes to use these wrappers. Example pattern:
  // Before:
  export async function GET(req: Request) {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
    ...
  }

  // After:
  export const GET = withAuth(async (req, { currentUser }) => {
    ...
  })

PART B — UPDATE MIDDLEWARE.TS

Extend the existing middleware from task-01 to handle:

1. Public routes (no auth required):
   ["/sign-in", "/sign-up", "/accept-invite", "/waik-demo-start"]

2. Super admin routes (/waik-admin/*):
   If authenticated but !isWaikSuperAdmin → return 403 response with plain text "Access denied."
   No WAiK branding. No information about the route.

3. Admin routes (/admin/*):
   If authenticated but !isAdminTier → redirect to /staff/dashboard

4. Staff routes (/staff/*):
   No role blocking (admins can also view staff routes if needed for support)

5. mustChangePassword check:
   If user.mustChangePassword AND path is not /change-password:
   → redirect to /change-password

6. Catch-all:
   If not authenticated AND not public route → redirect to /sign-in

Order matters — check in this sequence:
  a. Is this a public route? → skip all checks
  b. Is user authenticated? → if not, redirect to /sign-in
  c. Is mustChangePassword? → redirect to /change-password
  d. Is this /waik-admin? → check isWaikSuperAdmin
  e. Is this /admin? → check isAdminTier

PART C — ROLE GATE COMPONENT

Create components/role-gate.tsx:

interface RoleGateProps {
  allowedRoles?: string[]           // role slugs that can see children
  requireAdminTier?: boolean        // true = only admin-tier roles
  requirePhase2?: boolean           // true = only phase2-capable roles
  requireSuperAdmin?: boolean       // true = only super admins
  fallback?: React.ReactNode        // what to show if not allowed (default: null)
  children: React.ReactNode
}

Use the useUser() hook from Clerk to get publicMetadata.
Read roleSlug from publicMetadata.
Look up role permissions from a client-side cache (or pass as props).

For simplicity in the client component: read directly from Clerk publicMetadata
which already contains the role. Do permission checks against the metadata values.

Usage examples:
  <RoleGate requireAdminTier>
    <AdminOnlyButton />
  </RoleGate>

  <RoleGate allowedRoles={["rn","lpn","cna"]} fallback={<p>Not available for your role</p>}>
    <VoiceReportButton />
  </RoleGate>

  <RoleGate requireSuperAdmin>
    <SuperAdminLink />
  </RoleGate>

PART D — UNIT SELECTION MODAL

Create components/unit-selection-modal.tsx:

Props:
  units: string[]           — list of unit names from facility
  userId: string            — to key localStorage
  onSelect: (unit: string) => void
  onSkip: () => void        — if nurse is floating / no unit assignment

The modal:
  Title: "Which unit are you working today?"
  Subtext: "Select your unit so WAiK can surface the right information for you."
  A list of large tappable buttons, one per unit name
  "I'm floating / no assigned unit today" text link at bottom

State management:
  Key: "waik-unit-[userId]-[YYYY-MM-DD]"
  If localStorage has this key: do not show modal
  On selection: store selected unit in localStorage with today's date key
  Also store in React context so dashboard data-fetching can use it

Create context/unit-context.tsx:
  UnitContext with { selectedUnit: string | null, setSelectedUnit: (unit: string | null) => void }
  Wrap app/staff/layout.tsx with UnitProvider

In app/staff/dashboard/page.tsx:
  On mount:
    const today = new Date().toISOString().split("T")[0]
    const stored = localStorage.getItem(`waik-unit-${userId}-${today}`)
    if (!stored && facility.units.length > 0) {
      setShowUnitModal(true)
    } else {
      setSelectedUnit(stored)
    }

  Pass selectedUnit to all data-fetching calls as an optional filter.
  API routes accept ?unit=Wing+A as an optional filter — if absent, return all.

PART E — UPDATE ADMIN AND STAFF LAYOUTS

app/staff/layout.tsx:
  Wrap with UnitProvider
  Check: if user.roleSlug is an admin-tier role trying to use staff routes,
  allow it (admins sometimes need to test staff flows).

app/admin/layout.tsx:
  Check: if !currentUser.isAdminTier → redirect to /staff/dashboard
  This is backup to middleware — double-check at layout level.

Do not modify any existing page content — only add wrappers and guards.
The unit selection modal integrates with the existing dashboard from task-05
but can be added as a conditional render without rewriting the dashboard.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/01-PERMISSIONS.md` — document withAuth, withAdminAuth, RoleGate
- Create `plan/pilot_1/phase_0_identity/task-00e-DONE.md`
