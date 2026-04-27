# Task 5b-03 — Unified Resident Profile Page
## Phase: 5b — Staff Experience Redesign
## Estimated Time: 3–4 hours
## Depends On: task-5b-01 (shared components), task-08 (resident story base, if complete)

---

## Why This Task Exists

The admin already has a working resident profile (Images 4 and 5 in the
screenshots). Margaret Chen's page shows: room, care level, admission date,
tabs for Overview/Incidents/Assessments/Notes, care plan interventions with
Active/Removed states, MDS review suggestions, recent incidents, and a
notes system with category filters (All / Flagged / Team / Admin).

Staff need this same page. The question was whether to build a separate
staff-facing resident page. The answer is no — one URL, role-aware rendering.

`/residents/[id]` serves everyone. A RoleGate hides the MDS suggestions
section and the Admin notes filter from staff. Everything else is identical.

**Why role-aware on one page is better than two pages:**
- One codebase to maintain, not two
- Consistent URL structure (the DON can share a link and it works for both)
- The rendering logic is a few conditional checks, not a duplicated component tree
- Future additions automatically apply to both roles unless explicitly gated

---

## What Staff Sees vs Admin (the complete list)

**Both see:**
- Resident header: name, room, care level, status, admission date
- Overview tab: Care Plan Interventions (view, add, remove — same capabilities)
- Overview tab: Recent Incidents (last 3 with phase badges, completeness, View)
- Overview tab: Recent Assessments (last 2 per type)
- Incidents tab: full incident timeline (scoped to this resident — NOT to this nurse)
- Assessments tab: all assessments for this resident
- Notes tab: All notes, Team notes, Flagged notes
- Notes tab: Add Observation button

**Admin only (hidden for staff):**
- MDS Review Suggestions section (RoleGate: requireAdminTier)
- Admin notes category filter and admin-only note contents
  (the API already strips admin_only notes for non-admin roles)

Staff can see ALL team notes and flagged notes. They cannot see admin-only
notes. This matches the visibility model already established in task-08.

**Navigation to resident profile:**
- Staff: from /staff/residents search page, or from a resident's name
  in the incident detail page
- Admin: from /admin/residents list (already exists)

Both navigate to /residents/[id] — same URL, same page.

---

## Context Files

- `app/residents/[id]/page.tsx` — create at this path (shared URL)
- `app/staff/residents/page.tsx` — staff resident search (CREATE)
- `app/admin/residents/[id]/page.tsx` — if this exists: redirect to /residents/[id]
- `app/api/residents/[id]/route.ts` — verify GET returns correct shape
- `app/api/residents/[id]/notes/route.ts` — POST note
- `backend/src/models/note.model.ts` — from task-08
- `components/shared/phase-badge.tsx` — from task-5b-01
- `lib/permissions.ts` — isAdminTier for RoleGate

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `/residents/[id]` accessible to both staff and admin roles
- [ ] `/residents/[id]` returns 403 for unauthenticated requests
- [ ] `/residents/[id]` returns 403 if facilityId mismatch
- [ ] Header: resident name, room, care level, admission date visible to both roles
- [ ] Overview tab: Care Plan Interventions visible to both roles
- [ ] Overview tab: Add Intervention button visible to both roles
- [ ] Overview tab: Remove button on active interventions visible to both roles
- [ ] Overview tab: MDS Review Suggestions HIDDEN for staff, VISIBLE for admin
- [ ] Incidents tab: shows all resident's incidents (not just reporter's)
- [ ] Assessments tab: shows all resident's assessments
- [ ] Notes tab: All / Flagged / Team filters visible to both roles
- [ ] Notes tab: Admin filter HIDDEN for staff
- [ ] Notes tab: admin_only note content NOT returned by API for staff users
- [ ] "Add Observation" button works for both roles
- [ ] Submitted observation appears immediately in note list
- [ ] `/staff/residents` search page exists with name/room search
- [ ] Search navigates to /residents/[id] on selection

---

## Test Cases

```
TEST 1 — Staff accesses resident profile
  Action: Sign in as m.torres@sunrisemn.com
          Navigate to /residents/res-001 (Margaret Chen)
  Expected: Page loads. "Margaret Chen" header visible.
            Room 102, memory care, active visible.
  Pass/Fail: ___

TEST 2 — Admin accesses same URL
  Action: Sign in as s.kim@sunrisemn.com (DON)
          Navigate to /residents/res-001
  Expected: Same page loads with identical layout
  Pass/Fail: ___

TEST 3 — MDS section hidden for staff
  Action: Sign in as RN, view /residents/res-001 Overview tab
  Expected: "MDS review suggestions" section not visible
  Pass/Fail: ___

TEST 4 — MDS section visible for admin
  Action: Sign in as DON, view /residents/res-001 Overview tab
  Expected: "MDS review suggestions" accordion visible (may be collapsed)
  Pass/Fail: ___

TEST 5 — Care plan interventions visible to both
  Action: Staff views /residents/res-001 Overview
  Expected: "Bed alarm activated every night 8pm-7am" visible with Active badge
            "Physical restraint" visible with Removed badge (strikethrough style)
  Pass/Fail: ___

TEST 6 — Add Observation works for staff
  Action: Staff clicks "Add Observation" on Notes tab
          Fills in text, selects visibility "Team", submits
  Expected: Note saved. Appears immediately in note list.
            Note shows: author name, date, "Team" badge, "Not flagged" badge
  Pass/Fail: ___

TEST 7 — Admin filter hidden for staff
  Action: Staff views Notes tab
  Expected: Three filter buttons: All | Flagged | Team
            No "Admin" filter button visible
  Pass/Fail: ___

TEST 8 — Admin notes not returned in API for staff
  Action: POST a note with visibility "admin_only" as admin
          Sign in as staff, GET /api/residents/res-001
  Expected: admin_only note absent from API response for staff token
  Pass/Fail: ___

TEST 9 — Incidents tab shows ALL resident incidents, not just reporter's
  Action: Staff views /residents/res-002 Incidents tab
          Robert Johnson has INC-004 (Maria) and INC-006 (Maria) as incidents
  Expected: Both INC-004 and INC-006 visible in the timeline
            Even though the logged-in staff may not be Maria
  Pass/Fail: ___

TEST 10 — Staff resident search works
  Action: Navigate to /staff/residents
          Type "Margaret" in search
  Expected: Margaret Chen appears in results
          Clicking navigates to /residents/res-001
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building a unified resident profile page for WAiK. The same URL
/residents/[id] serves both staff and admin with role-aware rendering.

PART A — CREATE app/residents/[id]/page.tsx

"use client" component.

Auth: call getCurrentUser(). If not authenticated → redirect("/sign-in").
Fetch: GET /api/residents/[id]?facilityId=... on mount.

RESIDENT HEADER:
  Back arrow (← Back) → href depends on referrer:
    if user is admin tier: /admin/residents
    else: /staff/residents
  
  Large heading: resident.firstName + " " + resident.lastName
  Subheading row: "Room [roomNumber] • [careLevel] • [status]"
  Admission badge: "Admitted: [admissionDate formatted as YYYY-MM-DD]"

FOUR TABS (shadcn Tabs, default: Overview):

TAB 1 — OVERVIEW:

  CARE PLAN INTERVENTIONS section:
    Heading: "Care plan interventions" with count badge
    Expand/collapse chevron
    "Add intervention" button (teal) → opens dialog
    
    For each intervention:
      White card, rounded-xl, p-4, border
      Title: intervention.description (font-semibold)
      Badge row: department | type | "Placed [date]" |
        If isActive: teal "Active" badge
        If !isActive: gray "Removed" badge + "Removed [removedAt date]"
        If triggeringIncidentId: link "→ See incident"
      
      If isActive: "Remove" button (small, outline)
        On click: confirm dialog → PATCH /api/residents/[id]/interventions/[iid]
          { isActive: false }
    
    ADD INTERVENTION DIALOG:
      Fields: description (textarea), department (dropdown), type (Temporary/Permanent),
              startDate (date picker, default today), notes (optional)
      Submit → POST /api/residents/[id]/interventions
      On success: new card appears in list
  
  MDS REVIEW SUGGESTIONS section (ADMIN ONLY):
    Wrap in RoleGate (requireAdminTier):
    Heading: "MDS review suggestions"
    Lazy-loaded — only fetches when expanded
    Shows AI-generated suggestions from GET /api/residents/[id]/mds-recommendations
  
  RECENT INCIDENTS section:
    Heading: "Recent incidents" with count badge
    Last 3 incidents for this resident (by residentId — ALL staff, not just current user)
    Each: incident type badge + phase badge + "Room [X]" + date + completeness % + View link
  
  RECENT ASSESSMENTS section:
    Last 2 assessments per type
    Each: type + date + completeness % + conducted by

TAB 2 — INCIDENTS:
  Full timeline of all incidents for this resident (residentId filter)
  NOT scoped to current user's staffId
  Sort: newest first
  Each row: date | type | phase badge | completeness ring | reported by | View button

TAB 3 — ASSESSMENTS:
  All assessments for this resident
  Group by assessmentType
  Sort: newest first within each group
  Each row: date | type | completeness | conducted by | View button

TAB 4 — NOTES:
  
  FILTER TABS (not to be confused with page tabs):
    Pill buttons: All notes | Flagged | Team | Admin (Admin pill: only show for admin-tier users)
    Date range pickers: From / To
    Author dropdown: All authors / list of staff names
    "[N] of [total] notes in view"
  
  ADD OBSERVATION button (teal, top right):
    Opens dialog:
      Textarea: "Observation content..." max 2000 chars with counter
      Visibility: radio — Team (default) | Admin only
      Flag for admin: toggle (default off)
      Type: "Observation" pre-selected
    Submit → POST /api/residents/[id]/notes
      { content, visibility, isFlagged, parentType: "resident", parentId: id }
    On success: new note appears at top of list
  
  NOTE CARDS:
    Each: author avatar (initials) | content text | badge row:
    "Not flagged" or "⚑ Flagged" | visibility badge | author name | date | type
    
    If note.isFlagged: show red "Flagged" badge + card has amber left border
    
    IMPORTANT: admin_only notes — the API already strips these for non-admin
    tokens (established in task-08). The frontend does not need to filter —
    just render what the API returns.
  
  Admin filter pill (only shown for admin-tier users):
    When selected: shows only visibility: "admin_only" notes
    For staff: this filter button simply does not render

PART B — CREATE app/staff/residents/page.tsx

Simple resident search for staff. Same design as admin's residents page
but without "New Resident" or CSV import buttons.

Header: "Residents"
Search input: "Search by name or room number..."
  On submit: GET /api/residents?search=X&facilityId=Y
  Results table: Room | Name | Care Level | Status | View button
  View button → /residents/[id]

PART C — VERIFY REDIRECT for app/admin/residents/[id]

If app/admin/residents/[id]/page.tsx exists and has content:
  Replace it with a redirect:
  redirect(`/residents/${params.id}?facilityId=${searchParams.facilityId}`)
  
If it does not exist: no action needed — links in admin section should
already point to /residents/[id].

PART D — API VERIFICATION

Verify GET /api/residents/[id] returns:
  - All resident fields
  - interventions array (from InterventionModel)
  - recentIncidents: last 3 (filter by residentId, NOT staffId)
  - recentAssessments: last 2 per type
  - notes: strip admin_only if !currentUser.isAdminTier

If any of these are missing: add them to the route handler.

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/16-RESIDENT-PROFILE.md` — unified page spec
- Create `plan/pilot_1/phase_5b/task-5b-03-DONE.md`
