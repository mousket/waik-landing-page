# Task 00b — Seed Super Admins (Gerard + Scott)
## Phase: 0 — Platform Identity and Onboarding Infrastructure
## Estimated Time: 1–2 hours
## Depends On: task-00a (models must exist)

---

## Why This Task Exists

Gerard and Scott are the only two people who can ever access /waik-admin,
create organizations, create facilities, and create first administrators.
Their super admin status must be established at the database level before any
pilot community can be onboarded.

This task creates a one-time setup script that seeds both super admin users
in Clerk and MongoDB. It is designed to be run exactly once on a fresh
deployment. If run again, it is idempotent — it checks before creating.

---

## Context Files

- `backend/src/models/user.model.ts` — updated in task-00a
- `lib/auth.ts` — getCurrentUser() updated in task-00a
- `lib/permissions.ts` — requireSuperAdmin() created in task-00a
- `scripts/seed-roles.ts` — run this first if roles not yet seeded

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `scripts/seed-super-admins.ts` exists and runs without error
- [ ] After running: gerard@waik.care exists in Clerk with isWaikSuperAdmin: true
- [ ] After running: scott@waik.care exists in Clerk with isWaikSuperAdmin: true
- [ ] After running: both users exist in UserModel with isWaikSuperAdmin: true
- [ ] Both users have roleSlug: "administrator" in MongoDB
- [ ] Clerk publicMetadata for both: { isWaikSuperAdmin: true, role: "administrator" }
- [ ] Script is idempotent — running twice does not create duplicates or errors
- [ ] Both users can sign in to WAiK at /sign-in
- [ ] After sign-in: requireSuperAdmin() passes for both users
- [ ] After sign-in: requireSuperAdmin() fails for any other user

---

## Test Cases

```
TEST 1 — Seed script runs without error
  Action: npx ts-node scripts/seed-super-admins.ts
  Expected: "Super admins seeded successfully" in console output. No errors.
  Pass/Fail: ___

TEST 2 — Gerard exists in Clerk
  Action: Check Clerk dashboard for gerard@waik.care
  Expected: User exists with publicMetadata.isWaikSuperAdmin = true
  Pass/Fail: ___

TEST 3 — Scott exists in Clerk
  Action: Check Clerk dashboard for scott@waik.care
  Expected: User exists with publicMetadata.isWaikSuperAdmin = true
  Pass/Fail: ___

TEST 4 — Both exist in MongoDB
  Action: Query UserModel.find({ isWaikSuperAdmin: true })
  Expected: Two documents — gerard@waik.care and scott@waik.care
  Pass/Fail: ___

TEST 5 — Idempotent on second run
  Action: Run seed script again
  Expected: No error. Still exactly 2 super admin documents in MongoDB.
            No duplicate Clerk users created.
  Pass/Fail: ___

TEST 6 — Gerard can sign in and access super admin check
  Action: Sign in as gerard@waik.care. Call requireSuperAdmin(currentUser).
  Expected: No error thrown.
  Pass/Fail: ___

TEST 7 — Regular user fails super admin check
  Action: Sign in as any non-super-admin user. Call requireSuperAdmin(currentUser).
  Expected: 403 thrown.
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. I need a one-time seed script that creates
the two WAiK super admin users (Gerard and Scott) in both Clerk and MongoDB.

Create scripts/seed-super-admins.ts:

The script does the following for each super admin:

const superAdmins = [
  {
    firstName: "Gerard",
    lastName: "Beaubrun",
    email: "gerard@waik.care",
    tempPassword: process.env.SUPER_ADMIN_TEMP_PASSWORD || "WaiK@SuperAdmin2026!"
  },
  {
    firstName: "Scott",
    lastName: "Kallstrom",
    email: "scott@waik.care",
    tempPassword: process.env.SUPER_ADMIN_TEMP_PASSWORD || "WaiK@SuperAdmin2026!"
  }
]

For each:

STEP 1 — Check if Clerk user already exists:
  const existing = await clerkClient.users.getUserList({ emailAddress: [email] })
  If exists: skip Clerk creation, get the clerkUserId

STEP 2 — Create Clerk user if not exists:
  const clerkUser = await clerkClient.users.createUser({
    firstName,
    lastName,
    emailAddress: [email],
    password: tempPassword,
    publicMetadata: {
      role: "administrator",
      isWaikSuperAdmin: true,
      facilityId: null,
      organizationId: null
    }
  })

STEP 3 — Check if MongoDB UserModel already exists:
  const existing = await UserModel.findOne({ email })
  If exists: update publicMetadata in Clerk and skip MongoDB creation

STEP 4 — Create UserModel if not exists:
  await UserModel.create({
    id: generateId(),
    clerkUserId: clerkUser.id,
    firstName,
    lastName,
    email,
    roleSlug: "administrator",
    isWaikSuperAdmin: true,
    isActive: true,
    mustChangePassword: false,
    deviceType: "work",
    organizationId: null,
    facilityId: null
  })

STEP 5 — Log result:
  console.log(`✓ Super admin seeded: ${email}`)

After both users are processed:
  console.log("Super admins seeded successfully")
  process.exit(0)

Use try/catch around the whole script — on error:
  console.error("Seeding failed:", error)
  process.exit(1)

Add to package.json scripts:
  "seed:super-admins": "ts-node scripts/seed-super-admins.ts"

Also add to package.json scripts (combined seed):
  "seed:all": "npm run seed:roles && npm run seed:super-admins"

Add to .env.local (if not already present):
  SUPER_ADMIN_TEMP_PASSWORD=WaiK@SuperAdmin2026!

Note: Both super admins will use mustChangePassword: false because Gerard and
Scott will change their own passwords manually in Clerk dashboard.
Do not send any invitation emails for these two users — they set up
their own accounts directly.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/00-DATA-MODELS.md` — note super admin seeding
- Create `plan/pilot_1/phase_0_identity/task-00b-DONE.md`
