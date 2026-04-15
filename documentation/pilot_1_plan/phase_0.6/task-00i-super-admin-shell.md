# Task 00i — Super Admin Dashboard Shell
## Phase: 0.6 — Dashboard Shells and Navigation
## Estimated Time: 2–3 hours
## Depends On: task-00c (super admin panel), task-00h (admin shell for layout reference)

---

## Why This Task Exists

Gerard and Scott need a place to land when they sign in that gives them
an immediate read on every pilot community. The /waik-admin page was
created in Phase 0 task-00c for the operational flows — creating
organizations, facilities, and first admins. This task completes it into
a proper dashboard that Gerard and Scott actually want to look at.

The super admin shell is simpler than the staff and admin dashboards.
It does not need bottom tabs or complex navigation. It needs one thing:
a clear picture of the health of every pilot community at a glance.

This task also ensures the complete /waik-admin navigation is consistent
and that the facility deep-dive page from task-00c integrates cleanly
with the new shell layout.

---

## Context Files

- `app/waik-admin/page.tsx` — extend what was built in task-00c
- `app/waik-admin/layout.tsx` — create or update
- `app/waik-admin/organizations/[orgId]/page.tsx` — from task-00c
- `app/waik-admin/organizations/[orgId]/facilities/[facilityId]/page.tsx`
- `lib/auth.ts` — requireSuperAdmin()
- `lib/design-tokens.ts` — from task-00g

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] Signing in as gerard@waik.care → lands on /waik-admin
- [ ] Signing in as scott@waik.care → lands on /waik-admin
- [ ] Non-super-admin navigating to /waik-admin sees plain 403 with no info
- [ ] /waik-admin shows quick stats banner with 3 platform metrics
- [ ] /waik-admin shows organizations table with all 8 columns
- [ ] "New Organization" button visible and navigates to creation form
- [ ] /waik-admin/organizations/[id] shows organization detail and facilities list
- [ ] /waik-admin/organizations/[id]/facilities/[id] shows facility detail
- [ ] "Create Administrator" button visible on facility page
- [ ] Super admin layout shows minimal nav (wordmark + signed-in email + sign out)
- [ ] All existing task-00c flows still work (create org, create facility, create admin)
- [ ] No console errors on any waik-admin route

---

## Test Cases

```
TEST 1 — Super admin lands on waik-admin
  Action: Sign in as gerard@waik.care
  Expected: /waik-admin loads, organizations table visible
  Pass/Fail: ___

TEST 2 — Non-super-admin blocked
  Action: Sign in as administrator, navigate to /waik-admin
  Expected: Plain text "Access denied." — no WAiK branding or routing info
  Pass/Fail: ___

TEST 3 — Quick stats banner renders
  Action: Load /waik-admin
  Expected: Three metrics visible:
            Total Communities, Total Incidents This Month, Most Active Community
  Pass/Fail: ___

TEST 4 — Organizations table renders
  Action: Load /waik-admin
  Expected: Table with columns: Name, Type, Facilities, Staff, Plan, Created, Actions
  Pass/Fail: ___

TEST 5 — Organization create flow still works
  Action: Click "New Organization", fill form, submit
  Expected: Organization created. Redirects to facility creation.
  Pass/Fail: ___

TEST 6 — Facility deep dive accessible
  Action: Click "View" on any organization → click facility
  Expected: Facility detail page shows name, type, state, staff list,
            "Create Administrator" button
  Pass/Fail: ___

TEST 7 — All waik-admin routes load without error
  Action: Navigate to /waik-admin, /waik-admin/organizations/new,
          any existing org detail page
  Expected: No 404, no error, no blank page
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task completes the super admin
dashboard shell at /waik-admin. Phase 0 task-00c already built the
creation flows (org, facility, admin). This task adds the dashboard
overview layer and ensures the layout is consistent and polished.

PART A — SUPER ADMIN LAYOUT (app/waik-admin/layout.tsx)

Check if this exists from task-00c. If it does: update it.
If it does not: create it.

TOP BAR (fixed, full width, dark teal background #0A3D40):
  Height: 56px, padding horizontal 24px
  
  Left: "WAiK" text in white, font-bold, text-xl
        "Super Admin" label in #A8D8DA (light teal), text-sm, ml-2
  
  Right: flex gap-4 items center
    Signed-in email address in white, text-sm, opacity-75
    "Sign Out" link → /sign-out, text-sm, text-white, underline

CONTENT AREA:
  Padding top: 56px
  Background: #F5FAFA
  Min height: 100vh

SECURITY GUARD (already in place from task-00c — verify it is still there):
  If !currentUser.isWaikSuperAdmin:
    Return plain Response with text "Access denied." and status 403
    No redirect, no WAiK branding

PART B — UPDATE /waik-admin/page.tsx

Keep everything from task-00c. Add the dashboard header section above
the organizations table.

QUICK STATS BANNER:
  Full-width card, white background, border-radius 12px
  Margin: 24px, padding: 24px
  Heading: "WAiK Platform Overview" (font-semibold, text-dark-teal)
  
  Three stat boxes in a row (flex, equal width):
    Box 1: "Total Communities" — large number "2" in teal, label below in muted
    Box 2: "Incidents This Month" — large number "28" in teal, label below
    Box 3: "Most Active" — facility name "Sunrise Minneapolis" in teal, label below
  
  These are static placeholder numbers — real data comes when Intelligence
  queries are wired in task-09.

ORGANIZATIONS TABLE:
  Section heading: "Pilot Communities" (font-semibold, text-dark-teal, mt-8)
  "New Organization" button (teal, top right of section heading row)
  
  Table (already exists from task-00c, verify columns):
    Name | Type | Facilities | Staff Count | Plan | Created | Actions
  
  If table is missing or incomplete: rebuild it with these columns.
  Each row: "View" button → /waik-admin/organizations/[id]
  Empty state: "No communities yet. Create your first organization above."
  
  Add to Actions column (if not already there):
    "Add Facility" button (small, teal outline) → /waik-admin/organizations/[id]/facilities/new

PART C — FACILITY DEEP DIVE PAGE

app/waik-admin/organizations/[orgId]/facilities/[facilityId]/page.tsx
already exists from task-00c. Verify it has:

  HEADER: facility name (large, dark teal), type badge, state, plan badge, onboarding date
  
  TWO SECTIONS:

  Section 1 — "Staff" (heading with staff count badge):
    Table: Name | Role | Email | Status (Active/Pending) | Last Login
    Empty state: "No staff yet. Create the first administrator below."
    "Create Administrator" button → /waik-admin/.../create-admin
  
  Section 2 — "Facility Settings" (collapsed accordion):
    Shows: bed count, mandated reporting window, phase mode, units list
    Read-only display — editing happens in /admin/settings

  If any of these sections are missing from task-00c: add them now.
  If they exist and are complete: verify they render correctly and move on.

PART D — BREADCRUMB NAVIGATION

Add a simple breadcrumb to all nested /waik-admin pages:

  /waik-admin → /waik-admin/organizations/[id] → /waik-admin/.../facilities/[id]
  
  Format: "Super Admin / [Org Name] / [Facility Name]"
  Each segment is a link except the last (current page)
  Color: white links on dark teal top bar are too complex — put breadcrumb
  BELOW the top bar in the content area, muted gray text, text-sm
  
  Create components/admin/breadcrumb.tsx:
    Props: items: { label: string, href?: string }[]
    Render: item1 / item2 / item3 (last item no link, others are <Link>)

PART E — VERIFY ALL TASK-00C FLOWS STILL WORK

After making layout changes, manually verify these still function:
  1. Create new organization form submits and creates OrganizationModel
  2. Create new facility form submits and creates FacilityModel
  3. Create administrator form: creates Clerk user, creates UserModel,
     sends welcome email via Resend
  
  If any of these are broken by the layout changes: fix them before marking done.

Run npm run build and fix all TypeScript errors.
Do not create any API routes that do not already exist.
Do not modify any staff or admin routes.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/02-ONBOARDING-FLOW.md` — super admin dashboard
- Create `plan/pilot_1/phase_0.6/task-00i-DONE.md`
