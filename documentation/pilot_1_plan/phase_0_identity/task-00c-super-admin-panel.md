# Task 00c — Super Admin Panel: Create Organizations, Facilities, First Admin
## Phase: 0 — Platform Identity and Onboarding Infrastructure
## Estimated Time: 4–5 hours
## Depends On: task-00a, task-00b

---

## Why This Task Exists

Before any pilot community can use WAiK, Gerard or Scott must create the
organization, the facility within it, and the first administrator account.
This task builds the super admin panel that makes that possible without
requiring database access.

For the pilot: one organization = one facility. The org layer is lightweight
scaffolding. The critical work here is the facility creation form and the
first-admin creation flow — including the branded WAiK welcome email sent
via Resend with the temporary password.

This task also implements the welcome email template. This is the first thing
a new community administrator sees from WAiK. It must look professional —
WAiK teal (#0D7377), logo, clear instructions, and a single call to action.

---

## Context Files

- `backend/src/models/organization.model.ts` — created in task-00a
- `backend/src/models/facility.model.ts` — created in task-00a
- `backend/src/models/user.model.ts` — updated in task-00a
- `lib/permissions.ts` — requireSuperAdmin() from task-00a
- `app/waik-admin/page.tsx` — already planned, now build it here

---

## Environment Variables Required

Add to .env.local before running:
```
RESEND_API_KEY=re_...        (from resend.com dashboard)
EMAIL_FROM=waik@waik.care    (your verified sending domain)
NEXT_PUBLIC_APP_URL=http://localhost:3000  (or your Vercel URL)
```

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `/waik-admin` accessible only when isWaikSuperAdmin === true
- [ ] Non-super-admin navigating to /waik-admin receives 403 with no route info
- [ ] `/waik-admin` shows organizations table with correct columns
- [ ] `/waik-admin/organizations/new` creates OrganizationModel document
- [ ] `/waik-admin/organizations/[orgId]/facilities/new` creates FacilityModel
- [ ] `/waik-admin/organizations/[orgId]/facilities/[facilityId]/create-admin` creates:
      - Clerk user with correct publicMetadata
      - UserModel document with mustChangePassword: true
      - Sends WAiK welcome email via Resend
- [ ] Welcome email renders with WAiK teal branding and logo
- [ ] Welcome email contains temporary password and sign-in link
- [ ] After admin creation: admin appears in the facility's user list

---

## Test Cases

```
TEST 1 — Super admin access enforced
  Action: Navigate to /waik-admin as non-super-admin
  Expected: 403 page — no information about what the route is
  Pass/Fail: ___

TEST 2 — Super admin can access panel
  Action: Sign in as gerard@waik.care, navigate to /waik-admin
  Expected: Organizations table visible
  Pass/Fail: ___

TEST 3 — Create organization
  Action: Fill in organization form (name: "Sunrise Senior Living",
          type: "independent"), submit
  Expected: OrganizationModel document created. Redirects to facility creation.
  Pass/Fail: ___

TEST 4 — Create facility
  Action: Fill in facility form (name: "Sunrise Minneapolis",
          type: "alf", state: "MN", bedCount: 80), submit
  Expected: FacilityModel document created with organizationId linked.
  Pass/Fail: ___

TEST 5 — Create first administrator
  Action: Fill in admin form (firstName: "Jane", lastName: "Smith",
          email: "jane@sunrisemn.com"), submit
  Expected:
    - Clerk user created with publicMetadata: { role: "administrator",
      facilityId: [id], organizationId: [id], isWaikSuperAdmin: false }
    - UserModel created with mustChangePassword: true
    - Welcome email sent to jane@sunrisemn.com
  Pass/Fail: ___

TEST 6 — Welcome email renders
  Action: Check email received at jane@sunrisemn.com
  Expected: WAiK teal branding, logo, temporary password, sign-in link,
            clear "Change your password on first login" instruction
  Pass/Fail: ___

TEST 7 — Admin appears in facility user list
  Action: Navigate to /waik-admin/organizations/[id]/facilities/[id]
  Expected: Jane Smith visible in staff list with role "Administrator"
  Pass/Fail: ___

TEST 8 — Duplicate email blocked
  Action: Try to create admin with email that already exists in Clerk
  Expected: Error message: "A user with this email already exists"
            No duplicate created in Clerk or MongoDB
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task builds the super admin panel and
the welcome email flow using Resend. The super admin panel is only accessible
to users with isWaikSuperAdmin: true in their Clerk publicMetadata.

PART A — INSTALL RESEND AND CREATE EMAIL TEMPLATE

npm install resend

Create lib/email.ts:
  import { Resend } from 'resend'
  const resend = new Resend(process.env.RESEND_API_KEY)
  export { resend }

Create emails/welcome-admin.tsx — a React Email component:

The email template renders:
  - A full-width teal (#0D7377) header bar with "WAiK" wordmark in white
    (large, bold, font: Arial)
  - A white body section with:
    - "Welcome to WAiK" heading in dark teal (#0A3D40), bold
    - Personalized greeting: "Hi [firstName],"
    - Body text: "You have been set up as the Administrator for [facilityName].
      WAiK is a voice-first clinical documentation platform that will transform
      how your team reports and investigates incidents."
    - A teal (#0D7377) box showing:
      - "Your login credentials"
      - Email: [email]
      - Temporary Password: [tempPassword]
    - Important note in amber background:
      "You will be asked to change your password on first login."
    - A full-width teal button: "Sign in to WAiK"
      href: process.env.NEXT_PUBLIC_APP_URL + "/sign-in"
    - Separator line
    - Footer text in muted gray:
      "WAiK — Conversations not Checkboxes"
      "Questions? Contact us at hello@waik.care"

Props interface:
  firstName: string
  facilityName: string
  email: string
  tempPassword: string

Create lib/send-welcome-email.ts:
  import { resend } from './email'
  import { WelcomeAdminEmail } from '../emails/welcome-admin'

  export async function sendWelcomeEmail({
    to, firstName, facilityName, tempPassword
  }: { to: string, firstName: string, facilityName: string, tempPassword: string }) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: `Welcome to WAiK — Your administrator account is ready`,
      react: WelcomeAdminEmail({ firstName, facilityName, email: to, tempPassword })
    })
  }

PART B — API ROUTES

All routes require requireSuperAdmin(). Return 403 with generic message if not
super admin. Do not reveal what the route is or that it exists.

POST /api/waik-admin/organizations
  Body: { name, type, primaryContact? }
  Creates OrganizationModel with createdBySuperId = currentUser.clerkUserId
  Returns: created organization

GET /api/waik-admin/organizations
  Returns all organizations with facility count and last activity

POST /api/waik-admin/organizations/[orgId]/facilities
  Body: { name, type, state, bedCount, primaryContact?, units? }
  Creates FacilityModel with organizationId = orgId
  Sets onboardingDate = now
  Returns: created facility

GET /api/waik-admin/organizations/[orgId]/facilities
  Returns all facilities for this organization

POST /api/waik-admin/organizations/[orgId]/facilities/[facilityId]/admins
  Body: { firstName, lastName, email }

  Server steps:
  1. Check email does not already exist in Clerk:
     const existing = await clerkClient.users.getUserList({ emailAddress: [email] })
     If exists: return 409 { error: "A user with this email already exists" }

  2. Generate temporary password:
     const tempPassword = generateTempPassword() — 12 chars, mixed case + numbers

  3. Get facility name for welcome email:
     const facility = await FacilityModel.findById(facilityId)

  4. Create Clerk user:
     const clerkUser = await clerkClient.users.createUser({
       firstName,
       lastName,
       emailAddress: [email],
       password: tempPassword,
       publicMetadata: {
         role: "administrator",
         roleSlug: "administrator",
         facilityId,
         organizationId: orgId,
         isWaikSuperAdmin: false,
         facilityName: facility.name
       }
     })

  5. Create UserModel:
     await UserModel.create({
       id: generateId(),
       clerkUserId: clerkUser.id,
       firstName, lastName, email,
       roleSlug: "administrator",
       facilityId,
       organizationId: orgId,
       isWaikSuperAdmin: false,
       isActive: true,
       mustChangePassword: true,
       deviceType: "personal"
     })

  6. Send welcome email:
     await sendWelcomeEmail({ to: email, firstName, facilityName: facility.name, tempPassword })

  7. Return: { success: true, message: "Administrator created and welcome email sent" }

  Helper: generateTempPassword() — generates a random 12-character password
  with at least one uppercase, one lowercase, one number, one special char.
  Format: WaiK-XXXXXX (e.g. "WaiK-7kR9mP") — easy to communicate verbally if needed.

PART C — SUPER ADMIN PAGES

app/waik-admin/layout.tsx:
  Middleware check: call getCurrentUser(). If !user.isWaikSuperAdmin:
  render a plain 403 page: "Access denied." — nothing else. No WAiK branding.
  No information about what this route is.

  If authorized: render with a simple top bar:
  "WAiK Super Admin" left | "gerard@waik.care" right | Sign out link

app/waik-admin/page.tsx — ALL ORGANIZATIONS:
  Quick stats row: Total Organizations | Total Facilities | Total Staff

  Organizations table:
    Name | Type | Facilities | Staff Count | Plan | Created | Actions
    "View" button → /waik-admin/organizations/[orgId]
    "Add Facility" button → /waik-admin/organizations/[orgId]/facilities/new

  "New Organization" button → /waik-admin/organizations/new

app/waik-admin/organizations/new/page.tsx:
  Simple form: Organization Name (required), Type (dropdown), Primary Contact
  (name, email, phone — all optional)
  "Create Organization" button
  On success: redirect to /waik-admin/organizations/[newOrgId]/facilities/new
  (automatically take them to facility creation — for pilot, org = facility)

app/waik-admin/organizations/[orgId]/facilities/new/page.tsx:
  Form: Facility Name (required), Type (dropdown), State (US state dropdown),
  Bed Count (number), Units (comma-separated text input with help text:
  "Enter unit/wing names separated by commas, e.g. Wing A, Wing B, Memory Care")
  Primary Contact (name, email, phone)
  "Create Facility" button
  On success: redirect to /waik-admin/organizations/[orgId]/facilities/[facilityId]/create-admin

app/waik-admin/organizations/[orgId]/facilities/[facilityId]/create-admin/page.tsx:
  Heading: "Create First Administrator"
  Subtext: "This person will have full control of [facility name]. They will
           receive a welcome email with their temporary credentials."
  Form: First Name, Last Name, Email
  "Create Administrator & Send Welcome Email" button
  Loading state: "Creating account and sending email..."
  On success:
    Green success card: "Administrator created successfully."
    Show the admin's name and email.
    Show: "A welcome email was sent to [email] with their temporary password."
    Two buttons: "Create Another Administrator" | "Go to Super Admin Dashboard"

app/waik-admin/organizations/[orgId]/page.tsx:
  Organization detail: name, type, plan, created date
  Facilities list: each with name, type, state, staff count, "View" button
  "Add Facility" button

app/waik-admin/organizations/[orgId]/facilities/[facilityId]/page.tsx:
  Facility detail: name, type, state, bed count, units list, plan
  Staff list: name, role, email, isActive status
  "Create Administrator" button → /create-admin

Do not touch any staff-facing or admin-facing pages.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Document onboarding flow in `documentation/waik/02-ONBOARDING-FLOW.md`
- Create `plan/pilot_1/phase_0_identity/task-00c-DONE.md`
