# Task 10 — Staff Management & Role System
## Phase: 5 — Admin Settings & User Management
## Estimated Time: 6–7 hours
## Depends On: task-01, task-02

---

## Why This Task Exists

Without this task, you (Gerard or Scott) are the IT department for every pilot
community. Every time a new nurse joins, a staff member leaves, or someone
needs a role change, the administrator has to call you. This does not scale
past community number two. The administrator must own their own team — period.

This task also introduces the activity log, which is both a compliance feature
(who did what, when) and a pilot intelligence tool (are people actually using
the product?).

---

## Context Files

Read these before starting:
- `lib/auth.ts` — role hierarchy and permission helpers
- `backend/src/models/user.model.ts` — needs facilityId, orgId
- `app/admin/settings/` — destination for all settings pages

---

## Success Criteria

- [x] `npm run build` passes
- [x] `app/admin/settings/staff/page.tsx` shows all staff for the facility
- [x] "Invite Staff" form sends Clerk invitation email to entered email address
- [x] Pending invitations list shows all sent-but-not-accepted invitations
- [x] "Cancel" removes pending invitation
- [x] "Edit Role" modal changes role (respects permission matrix)
- [x] "Deactivate" suspends user (they cannot log in)
- [x] Role permission matrix enforced: DON cannot invite admin-tier roles
- [x] `components/role-gate.tsx` renders null for unauthorized roles
- [x] Activity log records login, incident creation, phase transition, user invite, role change
- [x] `app/admin/settings/activity/page.tsx` shows last 100 activity entries
- [x] Activity log is filterable by user and action type

---

## Test Cases

```
TEST 1 — Invite sends email
  Action: Fill "Invite Staff" form with new email and role "rn", submit
  Expected: Clerk invitation email sent; pending invitation appears in Pending list
  Pass/Fail: ___

TEST 2 — DON cannot invite administrator
  Action: As director_of_nursing role, attempt to invite with role "administrator"
  Expected: "administrator" is not available in the role dropdown
  Pass/Fail: ___

TEST 3 — Role change works
  Action: As administrator, change a staff member from "cna" to "rn"
  Expected: User's role updated in MongoDB and Clerk publicMetadata
  Pass/Fail: ___

TEST 4 — Deactivate blocks login
  Action: Deactivate a user. Attempt to sign in as that user.
  Expected: Sign-in fails with "account suspended" message
  Pass/Fail: ___

TEST 5 — RoleGate hides content
  Action: Render <RoleGate allowedRoles={["owner", "administrator"]}><button>Secret</button></RoleGate> as director_of_nursing
  Expected: Button is not rendered at all
  Pass/Fail: ___

TEST 6 — Activity log records invite
  Action: Invite a new staff member
  Expected: Activity log entry with action "user_invited" and the target email
  Pass/Fail: ___

TEST 7 — Activity log filter
  Action: Filter activity log by action "incident_created"
  Expected: Only incident creation entries appear
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14 with ClerkJS. I need a complete staff management system so administrators can manage their own team.

WHAT I NEED:

1. Create app/admin/settings/staff/page.tsx — Staff Management:

  SECTION 1 — Active Staff:
  Table: Name | Role Badge | Email | Last Active | Status | Actions
  Filter tabs: All | Admin Tier | Clinical Staff | Inactive
  Search by name or email
  Per-row actions:
    "Edit Role" button → opens dialog with role selector dropdown
    "Deactivate" button → confirmation dialog → PATCH /api/admin/staff/[userId]/deactivate
    "Resend Invite" (only if user never logged in) → resend Clerk invite

  SECTION 2 — Pending Invitations:
  Table: Email | Role | Invited By | Date Sent | Actions
  "Cancel" button per row → DELETE /api/admin/staff/invitations/[id]

  SECTION 3 — Invite New Staff:
  Form: Email (required), First Name (optional), Last Name (optional), Role (dropdown)
  Role dropdown options depend on current user's role — enforce permission matrix client-side AND server-side
  "Send Invitation" → POST /api/admin/staff/invite

2. Create API routes (all require getCurrentUser() and facilityId):
  GET  /api/admin/staff?facilityId=X — list users + last login timestamp
  POST /api/admin/staff/invite — send Clerk invitation, create pending User record in MongoDB
  PATCH /api/admin/staff/[userId]/role — change role, requires administrator/owner
  PATCH /api/admin/staff/[userId]/deactivate — suspend Clerk account, set user status to inactive
  GET  /api/admin/staff/invitations?facilityId=X — list pending Clerk invitations
  DELETE /api/admin/staff/invitations/[id] — revoke pending invitation

3. Permission matrix for invitations — enforce server-side:
  owner: can invite any role
  administrator: can invite any role EXCEPT owner
  director_of_nursing: can invite rn, lpn, cna, staff, physical_therapist, dietician only
  others: cannot invite (return 403)

4. Create components/role-gate.tsx:
  interface Props { allowedRoles: UserRole[]; children: React.ReactNode; fallback?: React.ReactNode }
  export function RoleGate({ allowedRoles, children, fallback = null }: Props)
  Gets current user role from Clerk's useUser() hook
  Returns children if role is in allowedRoles, otherwise returns fallback
  Use this throughout admin UI for conditional rendering

5. Create backend/src/models/activity-log.model.ts:
  id, userId, userName, role, facilityId
  action: "login" | "incident_created" | "phase2_claimed" | "investigation_closed" | "user_invited" | "role_changed" | "user_deactivated" | "assessment_completed"
  resourceType: string (optional)
  resourceId: string (optional)
  metadata: Schema.Types.Mixed (optional — extra context)
  ipAddress: string (optional)
  createdAt: Date (indexed)

6. Create lib/activity-logger.ts:
  logActivity({ userId, userName, role, facilityId, action, resourceType?, resourceId?, metadata?, req? })
  Call this from relevant API routes — do NOT await it (fire and forget, non-blocking)

7. Create app/admin/settings/activity/page.tsx:
  Table of last 100 activity entries for this facility
  Columns: User | Role | Action | Resource | Time
  Filter: by user (dropdown of facility staff) and by action type
  Entries are read-only — no delete
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_5/task-10-DONE.md`
