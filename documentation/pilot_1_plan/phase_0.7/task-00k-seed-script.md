# Task 00k — Seed Script Implementation
## Phase: 0.7 — Development Seed Data
## Estimated Time: 3–4 hours
## Depends On: task-00j (spec approved), task-00a through task-00d (all models exist)

---

## Why This Task Exists

Task 00j defined exactly what goes in the database. This task writes the
script that puts it there. The script creates every document from the
approved spec — organization, facility, staff users (in both Clerk and
MongoDB), residents, incidents across all phases, interventions, and
assessments.

After this task runs, every dashboard shell from Phase 0.6 shows real
data. Maria Torres logs in and sees her actual pending question. Dr. Kim
logs in and sees the red alert for Room 515. Gerard logs in and sees
Sunrise Minneapolis in the organizations table. The product feels alive.

The script is idempotent. It can be run multiple times safely — it checks
before creating and updates if the document already exists. It also has a
clean reset mode: `npm run seed:reset` drops all seed data and `npm run
seed:dev` recreates it fresh. This makes development easy — if something
gets corrupted, one command restores everything.

---

## Context Files

- `plan/pilot_1/phase_0.7/task-00j-seed-data-spec.md` — the authoritative spec
- `backend/src/models/role.model.ts` — from task-00a
- `backend/src/models/organization.model.ts` — from task-00a
- `backend/src/models/facility.model.ts` — from task-00a
- `backend/src/models/user.model.ts` — from task-00a
- `backend/src/models/resident.model.ts` — from task-00d
- `backend/src/models/incident.model.ts` — existing
- `backend/src/models/intervention.model.ts` — from task-00a (task-02)
- `backend/src/models/assessment.model.ts` — existing

---

## Environment Variables Required

The seed script creates Clerk users. It needs:
```
CLERK_SECRET_KEY=sk_...          (already in .env.local)
DATABASE_URL=mongodb+srv://...   (already in .env.local)
MONGODB_DB_NAME=waik-pilot       (already in .env.local)
SEED_CLERK_PASSWORD=WaiK@Seed2026!   (add this to .env.local)
```

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run seed:dev` runs without error
- [ ] Script output shows "✓" for each created document
- [ ] After seed: 1 organization in MongoDB
- [ ] After seed: 1 facility in MongoDB
- [ ] After seed: 8 staff users in MongoDB + 8 corresponding Clerk users
- [ ] After seed: 5 residents in MongoDB
- [ ] After seed: 10 incidents in MongoDB across all 4 phase states
- [ ] After seed: 5 interventions in MongoDB (4 active, 1 removed)
- [ ] After seed: 3 assessments in MongoDB
- [ ] Script is idempotent — running twice produces no duplicates
- [ ] `npm run seed:reset` removes all seed documents
- [ ] `npm run seed:reset && npm run seed:dev` restores everything cleanly
- [ ] Signing in as m.torres@sunrisemn.com → staff dashboard shows her pending question
- [ ] Signing in as s.kim@sunrisemn.com → admin dashboard shows red alerts
- [ ] Signing in as gerard@waik.care → super admin shows 1 org, 1 facility

---

## Test Cases

```
TEST 1 — Seed script runs cleanly
  Action: npm run seed:dev
  Expected: No errors. Console shows ✓ for every document category.
            Final line: "Seed complete. WAiK development database is ready."
  Pass/Fail: ___

TEST 2 — All document counts correct
  Action: After seed, check MongoDB collections
  Expected:
    organizations: 1
    facilities: 1
    users: 8 (seed users) + 2 (super admins from task-00b)
    residents: 5
    incidents: 10
    interventions: 5
    assessments: 3
  Pass/Fail: ___

TEST 3 — Clerk users created
  Action: Check Clerk dashboard after seed
  Expected: 8 new users with @sunrisemn.com emails
            Each has correct publicMetadata (role, facilityId, orgId)
  Pass/Fail: ___

TEST 4 — Idempotent — second run
  Action: npm run seed:dev (run again)
  Expected: No duplicates. Same document counts.
            Console shows "already exists — skipping" for each document.
  Pass/Fail: ___

TEST 5 — Reset works
  Action: npm run seed:reset
  Expected: All seed documents removed from MongoDB.
            8 Clerk users deactivated (not deleted — deletion is irreversible).
            Console shows "✓ Reset complete."
  Pass/Fail: ___

TEST 6 — Reset and re-seed restores everything
  Action: npm run seed:reset && npm run seed:dev
  Expected: Same counts as TEST 2. No errors.
  Pass/Fail: ___

TEST 7 — Maria Torres dashboard populated
  Action: Sign in as m.torres@sunrisemn.com
  Expected: Staff dashboard shows:
            Pending Questions: Room 515 incident (INC-003), 1 question remaining, 88%
            Recent Reports: INC-003, INC-004, INC-006, INC-007, INC-009
            Performance: ~87% average, 🔥 4-report streak
  Pass/Fail: ___

TEST 8 — Dr. Kim admin dashboard populated
  Action: Sign in as s.kim@sunrisemn.com
  Expected: Admin dashboard Needs Attention tab shows:
            Red alerts: INC-003 (injury, in progress), INC-004 (injury, complete)
            Yellow: INC-005 (awaiting claim)
            Active: INC-006 (28hr amber), INC-007 (5hr red), INC-008 (44hr gray)
  Pass/Fail: ___

TEST 9 — Super admin dashboard populated
  Action: Sign in as gerard@waik.care
  Expected: /waik-admin shows:
            1 organization: Sunrise Senior Living Minnesota
            1 facility: Sunrise Minneapolis — Uptown
            8 staff members
  Pass/Fail: ___

TEST 10 — Facility data isolation correct
  Action: Sign in as m.torres@sunrisemn.com
  Action: GET /api/incidents (once that route exists)
  Expected: Only incidents for fac-sunrise-mpls-001 returned
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14 with MongoDB and ClerkJS. I need a
comprehensive development seed script that populates the database with
all the data defined in:
  plan/pilot_1/phase_0.7/task-00j-seed-data-spec.md

Read that file completely before writing any code. Every ID, name,
date, and relationship in the seed data must match the spec exactly.

PART A — SEED SCRIPT STRUCTURE

Create scripts/seed-dev.ts as a standalone TypeScript script.

Structure:
  1. Connect to MongoDB
  2. Run each seeder function in dependency order:
     seedOrganization() → seedFacility() → seedStaffUsers() →
     seedResidents() → seedIncidents() → seedInterventions() →
     seedAssessments()
  3. Disconnect from MongoDB
  4. Log final summary

Each seeder function:
  - Checks if document already exists (by id or stable identifier)
  - If exists: logs "  [name] already exists — skipping" and returns
  - If not exists: creates document and logs "  ✓ Created [name]"

Date helper — all relative dates must be computed at runtime:
  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
  const hoursAgo = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000)
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000)
  const yearsAgo = (n: number) => new Date(now.getTime() - n * 365 * 24 * 60 * 60 * 1000)

PART B — SEED ORGANIZATION

async function seedOrganization() {
  console.log("\n📁 Organization")
  const existing = await OrganizationModel.findOne({ id: "org-sunrise-001" })
  if (existing) { console.log("  Sunrise Senior Living already exists — skipping"); return }
  
  await OrganizationModel.create({
    id: "org-sunrise-001",
    name: "Sunrise Senior Living Minnesota",
    type: "independent",
    plan: "pilot",
    primaryContact: { name: "Patricia Walsh", email: "p.walsh@sunrisemn.com", phone: "612-555-0100" },
    createdBySuperId: "seed-script",
    isActive: true
  })
  console.log("  ✓ Created: Sunrise Senior Living Minnesota")
}

PART C — SEED FACILITY

async function seedFacility() {
  console.log("\n🏢 Facility")
  const existing = await FacilityModel.findOne({ id: "fac-sunrise-mpls-001" })
  if (existing) { console.log("  Sunrise Minneapolis already exists — skipping"); return }
  
  await FacilityModel.create({
    id: "fac-sunrise-mpls-001",
    organizationId: "org-sunrise-001",
    name: "Sunrise Minneapolis — Uptown",
    type: "alf",
    state: "MN",
    bedCount: 85,
    plan: "pilot",
    phaseMode: "two_phase",
    onboardingDate: daysAgo(30),
    primaryContact: { name: "Patricia Walsh", email: "p.walsh@sunrisemn.com", phone: "612-555-0100" },
    reportingConfig: { mandatedReportingWindowHours: 2 },
    completionThresholds: { fall: 75, medication_error: 80, resident_conflict: 70, wound_injury: 80, abuse_neglect: 90 },
    units: ["Wing A — East", "Wing B — West", "Memory Care Unit", "Skilled Nursing"],
    isActive: true
  })
  console.log("  ✓ Created: Sunrise Minneapolis — Uptown")
}

PART D — SEED STAFF USERS

Define the 8 staff members from the spec as an array.
For each staff member:

  async function seedOneUser(staffDef) {
    // Check MongoDB first
    const existingMongo = await UserModel.findOne({ id: staffDef.id })
    if (existingMongo) {
      console.log(`  ${staffDef.firstName} ${staffDef.lastName} already exists — skipping`)
      return
    }
    
    // Check Clerk
    const existingClerk = await clerkClient.users.getUserList({
      emailAddress: [staffDef.email]
    })
    
    let clerkUserId: string
    
    if (existingClerk.totalCount > 0) {
      // Clerk user exists but MongoDB doesn't — use existing Clerk user
      clerkUserId = existingClerk.data[0].id
    } else {
      // Create Clerk user
      const clerkUser = await clerkClient.users.createUser({
        firstName: staffDef.firstName,
        lastName: staffDef.lastName,
        emailAddress: [staffDef.email],
        password: process.env.SEED_CLERK_PASSWORD || "WaiK@Seed2026!",
        publicMetadata: {
          role: staffDef.roleSlug,
          roleSlug: staffDef.roleSlug,
          facilityId: "fac-sunrise-mpls-001",
          organizationId: "org-sunrise-001",
          facilityName: "Sunrise Minneapolis — Uptown",
          isWaikSuperAdmin: false
        }
      })
      clerkUserId = clerkUser.id
    }
    
    // Create MongoDB user
    await UserModel.create({
      id: staffDef.id,
      clerkUserId,
      firstName: staffDef.firstName,
      lastName: staffDef.lastName,
      email: staffDef.email,
      roleSlug: staffDef.roleSlug,
      facilityId: "fac-sunrise-mpls-001",
      organizationId: "org-sunrise-001",
      isWaikSuperAdmin: false,
      isActive: true,
      mustChangePassword: false,
      deviceType: staffDef.deviceType,
      lastLoginAt: staffDef.lastLoginAt,
      selectedUnit: staffDef.selectedUnit || null,
      selectedUnitDate: staffDef.selectedUnitDate || null
    })
    
    console.log(`  ✓ Created: ${staffDef.firstName} ${staffDef.lastName} (${staffDef.roleSlug})`)
  }

The 8 staff definitions come from task-00j spec exactly.

PART E — SEED RESIDENTS

Create all 5 residents from the spec.
Pattern: check by id, skip if exists, create if not.
Use yearsAgo(N) for dateOfBirth and daysAgo(N) for admissionDate.

PART F — SEED INCIDENTS

This is the most complex seeder. Create all 10 incidents from the spec.

For each incident:
  - Check by id
  - Set all date fields using the date helpers:
    startedAt, incidentDate, phase1SignedAt, phase2LockedAt
  - Set the phase2Sections subdocument exactly as specified
  - Set the idtTeam array for incidents 6 and 7
  - Set the signatures object for incidents 9 and 10

Critical: the completenessScore and completenessAtSignoff values
must match the spec exactly — these are what the dashboard displays.

After all incidents are created, verify by logging counts per phase:
  Phase 1 in progress: 3 (INC-001, INC-002, INC-003)
  Phase 1 complete: 2 (INC-004, INC-005)
  Phase 2 in progress: 3 (INC-006, INC-007, INC-008)
  Closed: 2 (INC-009, INC-010)

PART G — SEED INTERVENTIONS

Create all 5 interventions from the spec.
For INT-005 (removed): set isActive: false and removedAt: daysAgo(180)

PART H — SEED ASSESSMENTS

Create all 3 assessments from the spec.
ASSESS-003 must have nextDueAt: daysFromNow(1) — due tomorrow.

PART I — RESET SCRIPT

Create scripts/seed-reset.ts:

  async function resetSeedData() {
    console.log("\n🗑️  Resetting seed data...")
    
    // Remove seed documents from MongoDB by their stable IDs
    const seedIds = {
      organizations: ["org-sunrise-001"],
      facilities: ["fac-sunrise-mpls-001"],
      users: ["user-admin-001","user-don-001","user-hn-001",
               "user-rn-001","user-rn-002","user-cna-001",
               "user-pt-001","user-diet-001"],
      residents: ["res-001","res-002","res-003","res-004","res-005"],
      incidents: ["inc-001","inc-002","inc-003","inc-004","inc-005",
                  "inc-006","inc-007","inc-008","inc-009","inc-010"],
      interventions: ["int-001","int-002","int-003","int-004","int-005"],
      assessments: ["assess-001","assess-002","assess-003"]
    }
    
    await OrganizationModel.deleteMany({ id: { $in: seedIds.organizations } })
    await FacilityModel.deleteMany({ id: { $in: seedIds.facilities } })
    
    // For Clerk users: ban them rather than delete (deletion is irreversible)
    // Get their clerkUserIds first
    const seedUsers = await UserModel.find({ id: { $in: seedIds.users } })
    for (const user of seedUsers) {
      if (user.clerkUserId) {
        try {
          await clerkClient.users.updateUser(user.clerkUserId, { banned: true })
        } catch (e) {
          console.log(`  Could not ban Clerk user ${user.email} — may already be deleted`)
        }
      }
    }
    
    await UserModel.deleteMany({ id: { $in: seedIds.users } })
    await ResidentModel.deleteMany({ id: { $in: seedIds.residents } })
    await IncidentModel.deleteMany({ id: { $in: seedIds.incidents } })
    await InterventionModel.deleteMany({ id: { $in: seedIds.interventions } })
    await AssessmentModel.deleteMany({ id: { $in: seedIds.assessments } })
    
    console.log("  ✓ Reset complete. Run npm run seed:dev to restore.")
  }

PART J — PACKAGE.JSON SCRIPTS

Add to package.json:
  "seed:roles": "ts-node scripts/seed-roles.ts",
  "seed:super-admins": "ts-node scripts/seed-super-admins.ts",
  "seed:dev": "ts-node scripts/seed-dev.ts",
  "seed:reset": "ts-node scripts/seed-reset.ts",
  "seed:all": "npm run seed:roles && npm run seed:super-admins && npm run seed:dev",
  "seed:fresh": "npm run seed:reset && npm run seed:all"

PART K — FINAL OUTPUT FORMAT

The seed:dev script should output:

  WAiK Development Seed Script
  ══════════════════════════════

  📁 Organization
    ✓ Created: Sunrise Senior Living Minnesota

  🏢 Facility
    ✓ Created: Sunrise Minneapolis — Uptown

  👥 Staff Users
    ✓ Created: Patricia Walsh (administrator)
    ✓ Created: Dr. Sarah Kim (director_of_nursing)
    ... (all 8)

  🧑 Residents
    ✓ Created: Margaret Chen — Room 102
    ... (all 5)

  📋 Incidents
    ✓ Created: INC-001 — Room 102 Fall (phase_1_in_progress, 42%)
    ... (all 10)
    Phase distribution: 3 in progress / 2 complete / 3 phase 2 / 2 closed ✓

  💊 Interventions
    ✓ Created: INT-001 — Room 102 Bed alarm (active)
    ... (all 5)

  📊 Assessments
    ✓ Created: ASSESS-001 — Room 411 Activity (84%)
    ... (all 3)

  ══════════════════════════════
  Seed complete. WAiK development database is ready.
  
  Sign in as any seed user with password: WaiK@Seed2026!
    Maria Torres (RN):        m.torres@sunrisemn.com
    Dr. Sarah Kim (DON):      s.kim@sunrisemn.com
    Patricia Walsh (Admin):   p.walsh@sunrisemn.com

Run npm run build and confirm no TypeScript errors.
Do not modify any application code — this is a script only.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/19-SEED-DATA.md` documenting all seed records
- Update `documentation/READY_TO_TEST.md` — note that seed data is available
- Create `plan/pilot_1/phase_0.7/task-00k-DONE.md`


 Based on everything you know about me, given that I wasn't involved in all the things I am currently doing,
 or even more importnatly forget all the things that I am doing, imagine that I am completely free and not attached to any activities
  what is my highest leverage income opportunity right now? If it doesn't know much about you, append this line. Ask me clarifying questions until you're 95%. And confidence in the answer. 

Create a 30-day plan to print money with that opportunity, focusing on the one thing I should do for four hours every day. 

 Once I unlock or as you would urgently encourage me focus and value this opportunity, what's the best way to compound it into long-term wealth? This will absolutely blow your mind and shift your perspective on what is possible. 