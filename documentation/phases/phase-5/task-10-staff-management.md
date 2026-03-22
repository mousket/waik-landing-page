# Task: Staff Management & Role System
## Phase: 5
## Depends On: task-09-phase2-intelligence
## Estimated Time: 6 hours

## Context Files
- app/admin/settings/staff/page.tsx (create)
- app/api/admin/staff/* (create)
- components/role-gate.tsx (create)
- backend/src/models/activity-log.model.ts (create)
- app/admin/settings/activity/page.tsx (create)

## Success Criteria
- [ ] Staff list: Name, Role, Email, Last Active, Status, Edit Role / Deactivate / Resend Invite
- [ ] Pending invitations list; Invite New Staff form (email, name, role)
- [ ] API: list staff, invite, change role, deactivate, list/cancel invitations
- [ ] Role permission matrix enforced (who can invite/change/deactivate)
- [ ] RoleGate component; Activity log model and page (last 100, filterable)

## Test Cases
- Owner can invite administrator; administrator cannot invite owner
- DON can invite only clinical roles; cannot change admin-tier roles
- Deactivate marks user inactive; activity log shows login, role_changed, user_deactivated

## Implementation Prompt

```
I'm building WAiK on Next.js 14 with ClerkJS. I need to build a complete staff management system so administrators and DONs can manage their own users without needing Gerard or Scott to do it for them.

This is a critical pilot feature. The community administrator must be able to:
- Invite new staff by email
- Assign roles and permissions
- Deactivate staff who leave
- Reset passwords (via Clerk's built-in flow)
- See who has accessed the system and when

WHAT I NEED:

1. Create app/admin/settings/staff/page.tsx — Staff Management:

   SECTION 1 — Active Staff List
   Table columns: Name | Role | Email | Last Active | Status | Actions
   Filters: All Roles | Admin Tier | Clinical Staff | Inactive
   Search by name or email
   
   Each row actions:
   - "Edit Role" — opens a modal to change role (only owner/administrator can do this)
   - "Deactivate" — suspends the Clerk account + marks user inactive in MongoDB
   - "Resend Invite" — resends the Clerk invitation email if pending

   SECTION 2 — Pending Invitations
   List of sent invitations not yet accepted
   Columns: Email | Role | Invited By | Date Sent | Actions
   "Cancel" button per invitation

   SECTION 3 — Invite New Staff
   Form: Email, First Name (optional), Last Name (optional), Role (dropdown)
   "Send Invitation" button
   On submit: calls Clerk's invitation API, creates a pending user record in MongoDB
   Show success toast with the invited email

2. Create API routes for staff management:
   - GET /api/admin/staff?facilityId=X — list all staff with last-active timestamps
   - POST /api/admin/staff/invite — send Clerk invitation + create pending MongoDB user
   - PATCH /api/admin/staff/[userId]/role — change role (requires administrator/owner)
   - PATCH /api/admin/staff/[userId]/deactivate — suspend Clerk account + mark inactive
   - GET /api/admin/staff/invitations?facilityId=X — list pending invitations
   - DELETE /api/admin/staff/invitations/[id] — cancel invitation

3. Role permission matrix — enforce these rules:
   Who can invite staff:
   - owner: can invite any role including administrator
   - administrator: can invite any role except owner
   - director_of_nursing: can invite rn, lpn, cna, staff, physical_therapist, dietician only
   - All others: cannot invite

   Who can change roles:
   - owner: can change any role
   - administrator: can change any role except owner
   - director_of_nursing: cannot change admin-tier roles

   Who can deactivate:
   - owner and administrator only

4. Create a RoleGate component (components/role-gate.tsx):
   <RoleGate allowedRoles={["owner", "administrator"]}>
     <SensitiveButton />
   </RoleGate>
   Renders null (or a disabled state) if the current user doesn't have the required role.
   Use this throughout the admin UI to hide/disable actions the user can't perform.

5. Create an Activity Log:
   backend/src/models/activity-log.model.ts:
   - userId, userName, role, facilityId
   - action: "login" | "incident_created" | "phase2_claimed" | "investigation_closed" | "user_invited" | "role_changed" | "user_deactivated"
   - resourceType, resourceId (what was acted on)
   - ipAddress, userAgent
   - createdAt

   Log entries for all sensitive actions automatically.
   
   Add app/admin/settings/activity/page.tsx showing the last 100 activity entries:
   Filterable by user, action type, and date range.
```
