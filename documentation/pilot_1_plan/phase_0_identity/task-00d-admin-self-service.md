# Task 00d — Administrator Self-Service: Invite Staff and Create Residents
## Phase: 0 — Platform Identity and Onboarding Infrastructure
## Estimated Time: 4–5 hours
## Depends On: task-00a, task-00b, task-00c

---

## Why This Task Exists

After Gerard creates a facility and its first administrator, WAiK must be
completely self-service from that point forward. The administrator should never
need to contact Gerard or Scott to invite a new nurse, change a role, or add
a resident. This task builds that entire self-service layer.

It also builds the staff invitation email — a branded WAiK email that tells
the new staff member who invited them, what WAiK is, and exactly how to get
started. This is the first time a frontline nurse sees WAiK. It matters.

Finally it implements the /accept-invite flow and the forced password change
on first login for staff created with a temporary password.

---

## Context Files

- `backend/src/models/role.model.ts` — roles seeded in task-00a
- `backend/src/models/user.model.ts` — updated in task-00a
- `backend/src/models/facility.model.ts` — created in task-00c
- `lib/permissions.ts` — requireAdminTier(), canInviteStaff()
- `lib/send-welcome-email.ts` — extend this with staff welcome email
- `app/admin/settings/staff/page.tsx` — build this here (from task-10 plan)
- `middleware.ts` — add mustChangePassword redirect

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `/admin/settings/staff` shows active staff, pending invites, invite form
- [ ] Role dropdown in invite form populated from RoleModel (not hardcoded)
- [ ] Invite form creates Clerk user + UserModel + sends staff welcome email
- [ ] Staff welcome email renders with WAiK branding, inviter name, temp password
- [ ] Staff appearing in Pending Invitations until they first log in
- [ ] Staff moved to Active list after first login
- [ ] Deactivate staff sets isActive: false in MongoDB + Clerk user disabled
- [ ] Resend Invite button resends the staff welcome email
- [ ] Bulk CSV import creates multiple staff in sequence
- [ ] CSV template download works with correct column headers
- [ ] `/accept-invite` page renders with community name and WAiK branding
- [ ] `/change-password` page appears for mustChangePassword users
- [ ] After password change: mustChangePassword = false, redirects to dashboard
- [ ] Middleware blocks any route except /change-password for mustChangePassword users
- [ ] `/admin/residents` shows facility-scoped resident list
- [ ] Create resident form creates ResidentModel with facilityId from auth

---

## Test Cases

```
TEST 1 — Role dropdown shows all 10 roles
  Action: Open /admin/settings/staff, view invite form role dropdown
  Expected: All 10 roles visible from RoleModel (not hardcoded strings)
  Pass/Fail: ___

TEST 2 — Invite single staff member
  Action: Fill form (firstName: "Maria", lastName: "Torres",
          email: "m.torres@sunrise.com", role: "rn"), submit
  Expected:
    - Clerk user created with correct publicMetadata
    - UserModel created with mustChangePassword: true
    - Staff welcome email sent
    - Maria appears in Pending Invitations list
  Pass/Fail: ___

TEST 3 — Staff welcome email content
  Action: Check email received at m.torres@sunrise.com
  Expected: WAiK branding, invited-by name visible, temp password,
            sign-in link, clear first-login instructions
  Pass/Fail: ___

TEST 4 — First login triggers password change
  Action: Sign in as maria.torres@sunrise.com with temp password
  Expected: Redirected to /change-password before reaching dashboard
  Pass/Fail: ___

TEST 5 — Password change clears flag
  Action: Complete /change-password form
  Expected: mustChangePassword = false in UserModel
            Redirected to /staff/dashboard
            Onboarding tooltips appear
  Pass/Fail: ___

TEST 6 — Deactivate staff
  Action: Click Deactivate on Maria Torres in active staff list
  Expected: Confirmation dialog. On confirm: isActive = false in MongoDB.
            Maria cannot sign in (Clerk user disabled).
  Pass/Fail: ___

TEST 7 — Role enforcement on invite
  Action: Sign in as director_of_nursing (canInviteStaff: false)
          Navigate to /admin/settings/staff
  Expected: Invite form not visible. "Contact your administrator to add staff."
  Pass/Fail: ___

TEST 8 — CSV import — valid file
  Action: Upload CSV with 3 valid staff rows
  Expected: 3 users created in Clerk + MongoDB. 3 welcome emails sent.
            Results table shows 3 green rows.
  Pass/Fail: ___

TEST 9 — CSV import — invalid row blocked
  Action: Upload CSV with 1 valid row and 1 row missing email
  Expected: Valid row created. Invalid row shown in red with error.
            Import button disabled until errors resolved.
  Pass/Fail: ___

TEST 10 — Create resident
  Action: POST /api/residents { firstName: "Maria", lastName: "Chen",
          roomNumber: "204", careLevel: "assisted" }
  Expected: ResidentModel created with facilityId from auth
  Pass/Fail: ___

TEST 11 — Resident list is facility-scoped
  Action: GET /api/residents
  Expected: Only residents for the authenticated user's facility
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task builds the administrator's
self-service staff management and the staff onboarding flow with branded
Resend emails. Administrators have canInviteStaff: true. DONs do not.

PART A — STAFF WELCOME EMAIL TEMPLATE

Create emails/welcome-staff.tsx — React Email component:

Props: firstName, facilityName, inviterName, inviterRole, email, tempPassword

Renders:
  - WAiK teal header bar with "WAiK" wordmark in white
  - White body:
    - "You have been invited to WAiK" heading in dark teal
    - "Hi [firstName],"
    - "[inviterName] ([inviterRole]) at [facilityName] has set up your WAiK account.
      WAiK helps you document incidents by voice — speak naturally about what
      happened and WAiK guides you through the rest."
    - Teal credentials box:
        Email: [email]
        Temporary Password: [tempPassword]
    - Amber note: "You will be asked to change your password when you first sign in."
    - Teal "Sign in to WAiK" button → NEXT_PUBLIC_APP_URL + "/sign-in"
    - Gray footer: "WAiK — Conversations not Checkboxes"

Add to lib/send-welcome-email.ts:
  export async function sendStaffWelcomeEmail({
    to, firstName, facilityName, inviterName, inviterRole, tempPassword
  }) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: `${inviterName} has invited you to WAiK at ${facilityName}`,
      react: WelcomeStaffEmail({ firstName, facilityName, inviterName,
                                 inviterRole, email: to, tempPassword })
    })
  }

PART B — STAFF MANAGEMENT API ROUTES

All routes require getCurrentUser() + facilityId scoping.

GET /api/admin/staff?facilityId=X
  Returns all UserModel documents for this facility
  Separated into: active (isActive: true) and pending (never logged in)
  "Never logged in" = lastLoginAt is null
  Requires isAdminTier

POST /api/admin/staff/invite
  Body: { firstName, lastName, email, roleSlug }
  Requires canInviteStaff: true on current user's role

  Steps:
  1. Validate roleSlug exists in RoleModel
  2. Check email not already in Clerk for this facility
  3. Generate tempPassword (same helper as task-00c)
  4. Get current user's name and role for inviter info
  5. Create Clerk user with publicMetadata:
     { role: roleSlug, facilityId, organizationId, isWaikSuperAdmin: false,
       facilityName: facility.name }
  6. Create UserModel with mustChangePassword: true
  7. Call sendStaffWelcomeEmail()
  8. Return: { success: true }

PATCH /api/admin/staff/[userId]/deactivate
  Requires canInviteStaff
  Sets UserModel.isActive = false
  Disables Clerk user: await clerkClient.users.updateUser(clerkUserId, { banned: true })
  Returns: { success: true }

PATCH /api/admin/staff/[userId]/reactivate
  Sets UserModel.isActive = true
  Unbans Clerk user
  Returns: { success: true }

POST /api/admin/staff/[userId]/resend-invite
  Generates new tempPassword, updates Clerk password, resends staff welcome email
  Sets mustChangePassword: true
  Returns: { success: true }

PATCH /api/admin/staff/[userId]/role
  Body: { roleSlug }
  Requires canInviteStaff
  Updates UserModel.roleSlug
  Updates Clerk publicMetadata.role and publicMetadata.roleSlug
  Returns: { success: true }

PART C — BULK CSV IMPORT

POST /api/admin/staff/import
  Body: multipart/form-data with CSV file
  Required CSV columns: first_name, last_name, email, role_slug
  Optional: phone

  Processing:
  1. Parse CSV using a lightweight parser
  2. Validate each row:
     - email is valid format
     - role_slug exists in RoleModel
     - first_name and last_name are not empty
  3. Return preview: { rows: [{ ...data, status: "valid"|"error"|"duplicate",
     error?: string }] }
  This is a preview endpoint — does not create users yet.

POST /api/admin/staff/import/confirm
  Body: { rows: validatedRows[] }
  For each valid row: run same creation flow as /invite
  Returns: { created: N, failed: N, results: [{email, status, error?}] }

PART D — STAFF MANAGEMENT PAGE

app/admin/settings/staff/page.tsx:

SECTION 1 — ACTIVE STAFF:
Table: Name | Role | Email | Last Login | Status | Actions
Actions per row: Edit Role (dropdown from RoleModel) | Deactivate | Resend Invite
"Last Login" shows "Never" if lastLoginAt is null (pending state)
Search input filters by name or email

SECTION 2 — INVITE NEW STAFF:
Form: First Name | Last Name | Email | Role (dropdown from GET /api/admin/roles)
"Send Invitation" button
Only visible when currentUser.role.canInviteStaff === true
If not permitted: show "Contact your organization administrator to add staff members."

SECTION 3 — BULK IMPORT:
"Import from CSV" button → opens a three-step dialog:

Step 1 — Upload:
  Drag-and-drop zone. "Download Template" button downloads a CSV with headers:
  first_name,last_name,email,role_slug
  Below: "Valid role values: owner, administrator, director_of_nursing,
  head_nurse, rn, lpn, cna, staff, physical_therapist, dietician"

Step 2 — Preview and Validate:
  Table showing parsed rows with status indicators
  Green = valid, Red = error (with reason), Yellow = already exists (will skip)
  Summary: "X will be created, Y have errors, Z already exist"
  "Import [X] Staff Members" button — disabled if any red rows

Step 3 — Results:
  Progress bar while creating
  Final summary with per-user results
  "Done" button closes dialog

PART E — ACCEPT INVITE AND FIRST LOGIN

app/accept-invite/page.tsx:
  Full-screen teal background. WAiK logo large.
  "Welcome to WAiK" heading in white
  Subtext: "You've been invited to [facilityName]."
  Note: "Please sign in with the credentials from your welcome email."
  Teal button: "Sign In" → /sign-in
  Small text: "Your password will need to be changed after first sign in."

  facilityName comes from a query param: /accept-invite?facility=Sunrise+Minneapolis
  (the welcome email link includes this)

Update middleware.ts:
  After getCurrentUser():
  If user exists AND user.mustChangePassword === true:
    If current path is NOT /change-password AND NOT /sign-in AND NOT /sign-out:
      redirect to /change-password

app/change-password/page.tsx:
  Heading: "Create your password"
  Subtext: "Please set a new password to get started with WAiK."
  New Password input (with strength indicator)
  Confirm Password input
  "Set Password" button

  On submit → PATCH /api/auth/change-password { newPassword }
  Server:
    1. Verify passwords match (client-side too)
    2. Update Clerk password: await clerkClient.users.updateUser(clerkUserId, { password: newPassword })
    3. Set UserModel.mustChangePassword = false
    4. Return success

  On success: redirect to role-appropriate dashboard
  Dashboard detects first login (lastLoginAt was null) → shows onboarding tooltips

PART F — FIRST LOGIN DETECTION

In app/staff/dashboard/page.tsx (or the layout):
  On mount: check localStorage for "waik-onboarding-complete-[userId]"
  If not set: show four-step tooltip overlay:
    Step 1: "Welcome to WAiK. This is your dashboard."
    Step 2: "Tap Report Incident to start a voice report."
    Step 3: "Pending questions appear here when WAiK needs more detail."
    Step 4: "You are ready to go."
  After step 4: set localStorage key. Tooltips never show again.

In the API route PATCH /api/auth/change-password:
  Also update UserModel.lastLoginAt = now (marks as "has logged in")

PART G — RESIDENT CREATION (minimal for now, expanded in task-08)

If backend/src/models/resident.model.ts does not exist yet, create a minimal version:
  id, facilityId, organizationId, firstName, lastName, roomNumber,
  careLevel: enum ["independent","assisted","memory_care","skilled_nursing"]
  status: "active" (default)
  createdAt, updatedAt

GET /api/residents — facility-scoped resident list
POST /api/residents — create resident, facilityId from auth
  Requires canManageResidents or isAdminTier

app/admin/residents/page.tsx — minimal for now:
  Search input, table with Name | Room | Care Level | Actions
  "Add Resident" button → opens inline form or /admin/residents/new
  Full resident story is built in task-08

Do not touch super admin routes, intelligence, or any Phase 2 code.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/02-ONBOARDING-FLOW.md` — staff invitation flow
- Document staff management API in `documentation/waik/03-API-REFERENCE.md`
- Create `plan/pilot_1/phase_0_identity/task-00d-DONE.md`
