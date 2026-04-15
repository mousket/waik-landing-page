# Task 00a — Role and Organization Data Models
## Phase: 0 — Platform Identity and Onboarding Infrastructure
## Estimated Time: 2–3 hours
## Depends On: task-00 (Vitest), task-01 (ClerkJS)

---

## Why This Task Exists

Every subsequent task in the entire build plan assumes three things are true:
users have a role, users belong to a facility, and that facility belongs to an
organization. None of those relationships exist in the database yet.

This task creates the four foundational models — RoleModel, OrganizationModel,
FacilityModel, and the expanded UserModel — and seeds the 10 default WAiK roles.
These models are the source of truth for everything that follows. The permission
helpers in lib/auth.ts, the invitation flow in task-00c and task-00d, and the
data isolation in task-02 all build directly on what is created here.

For the pilot: one organization equals one facility. The organization layer is
simple scaffolding that scales later without code changes.

---

## Context Files

- `backend/src/models/incident.model.ts` — follow this pattern for new models
- `backend/src/models/user.model.ts` — expanding this significantly
- `lib/auth.ts` — getCurrentUser() will be updated to use these models
- `lib/db.ts` — add connection helpers for new models

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] `backend/src/models/role.model.ts` exists with all fields
- [ ] `backend/src/models/organization.model.ts` exists with all fields
- [ ] `backend/src/models/facility.model.ts` exists with all fields
- [ ] `backend/src/models/user.model.ts` updated with all new fields
- [ ] `lib/types.ts` updated with all new TypeScript interfaces
- [ ] Seed script `scripts/seed-roles.ts` exists and runs without error
- [ ] After running seed script: 10 role documents exist in MongoDB
- [ ] `lib/auth.ts` updated — getCurrentUser() returns role permissions object
- [ ] `lib/permissions.ts` created with all permission helper functions

---

## Test Cases

```
TEST 1 — RoleModel saves correctly
  Action: Create a RoleModel document with slug "rn"
  Expected: Document saved with all required fields, retrievable by slug
  Pass/Fail: ___

TEST 2 — Seed script creates all 10 roles
  Action: Run npm run seed:roles
  Expected: 10 documents in the roles collection with correct slugs:
            owner, administrator, director_of_nursing, head_nurse,
            rn, lpn, cna, staff, physical_therapist, dietician
  Pass/Fail: ___

TEST 3 — Seed script is idempotent
  Action: Run npm run seed:roles twice
  Expected: Still exactly 10 role documents — no duplicates
  Pass/Fail: ___

TEST 4 — FacilityModel saves with organizationId
  Action: Create a FacilityModel linked to an OrganizationModel id
  Expected: Document saved, retrievable, organizationId matches
  Pass/Fail: ___

TEST 5 — UserModel accepts all new fields
  Action: Create a UserModel with clerkUserId, roleSlug, facilityId, deviceType
  Expected: Document saved without validation errors
  Pass/Fail: ___

TEST 6 — getCurrentUser() returns permissions
  Action: Mock a Clerk session with role: "director_of_nursing" in publicMetadata
  Expected: getCurrentUser() returns { canAccessPhase2: true, isAdminTier: true, ... }
  Pass/Fail: ___

TEST 7 — canAccessPhase2 correct for staff role
  Action: Mock session with role: "cna"
  Expected: canAccessPhase2() returns false
  Pass/Fail: ___

TEST 8 — isWaikSuperAdmin gated correctly
  Action: Mock session with isWaikSuperAdmin: false
  Expected: requireSuperAdmin() throws 403
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14 with MongoDB and ClerkJS. This task creates
the four foundational data models for the platform identity system and seeds
the default roles.

PART A — CREATE MODELS

1. Create backend/src/models/role.model.ts:

interface IRole:
  id: String (required, unique)
  name: String (required) — display name e.g. "Director of Nursing"
  slug: String (required, unique, indexed) — e.g. "director_of_nursing"
  description: String (optional)
  permissions: [String] — list of permission strings this role has
  isAdminTier: Boolean (default false) — true for owner, administrator, DON, head_nurse
  canAccessPhase2: Boolean (default false) — true for owner, administrator, DON
  canInviteStaff: Boolean (default false) — true for owner, administrator
  canManageResidents: Boolean (default false) — true for owner, administrator, DON
  canViewIntelligence: Boolean (default true) — all roles can view their scoped intelligence
  facilityScoped: Boolean (default true) — false only for super admin
  createdAt, updatedAt: Date

2. Create backend/src/models/organization.model.ts:

interface IOrganization:
  id: String (required, unique, indexed)
  name: String (required)
  type: String enum ["snf_chain","independent","government","nonprofit","other"]
  primaryContact: { name: String, email: String, phone: String } (_id: false)
  plan: String enum ["pilot","enterprise"] (default "pilot")
  createdBySuperId: String (the clerkUserId of the super admin who created it)
  isActive: Boolean (default true)
  createdAt, updatedAt: Date

3. Create backend/src/models/facility.model.ts:

interface IFacility:
  id: String (required, unique, indexed)
  organizationId: String (required, indexed)
  name: String (required)
  type: String enum ["snf","alf","memory_care","ccrc","other"]
  state: String (US state code, required)
  bedCount: Number
  primaryContact: { name: String, email: String, phone: String } (_id: false)
  reportingConfig: {
    mandatedReportingWindowHours: { type: Number, default: 2 }
  }
  phaseMode: String enum ["two_phase","one_phase"] (default "two_phase")
  completionThresholds: {
    fall: { type: Number, default: 75 },
    medication_error: { type: Number, default: 80 },
    resident_conflict: { type: Number, default: 70 },
    wound_injury: { type: Number, default: 80 },
    abuse_neglect: { type: Number, default: 90 }
  }
  notificationPreferences: Schema.Types.Mixed (default {})
  units: [String] — list of unit/wing names e.g. ["Wing A","Wing B","Memory Care"]
  plan: String enum ["pilot","enterprise"] (default "pilot")
  onboardingDate: Date
  isActive: Boolean (default true)
  createdAt, updatedAt: Date

  Index: { organizationId: 1, isActive: 1 }

4. Update backend/src/models/user.model.ts — ADD these fields:
  clerkUserId: String (required, unique, indexed) — the Clerk user ID
  organizationId: String (indexed)
  facilityId: String (required, indexed)
  firstName: String (required)
  lastName: String (required)
  email: String (required, unique, indexed)
  roleSlug: String (required) — references RoleModel.slug
  isWaikSuperAdmin: Boolean (default false)
  deviceType: String enum ["personal","work"] (default "personal")
  mustChangePassword: Boolean (default false)
  isActive: Boolean (default true)
  selectedUnit: String (optional — which unit nurse selected for today)
  selectedUnitDate: String (optional — date string YYYY-MM-DD for unit selection)
  lastLoginAt: Date
  createdAt, updatedAt: Date

  Keep all existing fields. Add compound indexes:
  { facilityId: 1, roleSlug: 1 }
  { clerkUserId: 1 } (unique)

PART B — UPDATE LIB/TYPES.TS

Add these TypeScript interfaces:

interface WaikRole {
  id: string
  name: string
  slug: string
  permissions: string[]
  isAdminTier: boolean
  canAccessPhase2: boolean
  canInviteStaff: boolean
  canManageResidents: boolean
  canViewIntelligence: boolean
  facilityScoped: boolean
}

interface WaikOrganization {
  id: string
  name: string
  type: string
  plan: string
  isActive: boolean
}

interface WaikFacility {
  id: string
  organizationId: string
  name: string
  type: string
  state: string
  bedCount: number
  phaseMode: 'two_phase' | 'one_phase'
  completionThresholds: Record<string, number>
  units: string[]
  plan: string
}

interface WaikUser {
  id: string
  clerkUserId: string
  organizationId: string
  facilityId: string
  firstName: string
  lastName: string
  email: string
  roleSlug: string
  role: WaikRole  // populated from RoleModel
  isWaikSuperAdmin: boolean
  deviceType: 'personal' | 'work'
  mustChangePassword: boolean
  isActive: boolean
}

interface CurrentUser {
  clerkUserId: string
  userId: string  // MongoDB _id
  facilityId: string
  organizationId: string
  firstName: string
  lastName: string
  email: string
  roleSlug: string
  role: WaikRole
  isWaikSuperAdmin: boolean
  deviceType: 'personal' | 'work'
  mustChangePassword: boolean
  // Convenience permission flags (from role)
  isAdminTier: boolean
  canAccessPhase2: boolean
  canInviteStaff: boolean
  canManageResidents: boolean
}

PART C — SEED SCRIPT

Create scripts/seed-roles.ts:

The 10 default WAiK roles with correct permission settings:

const roles = [
  {
    slug: "owner",
    name: "Owner",
    isAdminTier: true,
    canAccessPhase2: true,
    canInviteStaff: true,
    canManageResidents: true,
    permissions: ["*"]  // all permissions
  },
  {
    slug: "administrator",
    name: "Administrator",
    isAdminTier: true,
    canAccessPhase2: true,
    canInviteStaff: true,
    canManageResidents: true,
    permissions: ["incidents:*","assessments:*","residents:*","staff:*","settings:*","intelligence:*","phase2:*"]
  },
  {
    slug: "director_of_nursing",
    name: "Director of Nursing",
    isAdminTier: true,
    canAccessPhase2: true,
    canInviteStaff: false,
    canManageResidents: true,
    permissions: ["incidents:*","assessments:*","residents:read","phase2:*","intelligence:*"]
  },
  {
    slug: "head_nurse",
    name: "Head Nurse",
    isAdminTier: true,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:*","assessments:*","residents:read","intelligence:own"]
  },
  {
    slug: "rn",
    name: "Registered Nurse",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:create","incidents:own","assessments:create","assessments:own","intelligence:own"]
  },
  {
    slug: "lpn",
    name: "Licensed Practical Nurse",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:create","incidents:own","assessments:create","assessments:own","intelligence:own"]
  },
  {
    slug: "cna",
    name: "Certified Nursing Assistant",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:create","incidents:own","intelligence:own"]
  },
  {
    slug: "staff",
    name: "Staff",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:create","incidents:own","intelligence:own"]
  },
  {
    slug: "physical_therapist",
    name: "Physical Therapist",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:own","assessments:create","assessments:own","intelligence:own"]
  },
  {
    slug: "dietician",
    name: "Dietician",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["assessments:create","assessments:own","intelligence:own"]
  }
]

Use upsert (updateOne with upsert:true) keyed on slug — makes the script
idempotent (safe to run multiple times without creating duplicates).

Add to package.json scripts:
"seed:roles": "ts-node scripts/seed-roles.ts"

PART D — UPDATE LIB/AUTH.TS

Update getCurrentUser() to:
1. Get Clerk session as before
2. Look up UserModel by clerkUserId — if not found, return null
3. Look up RoleModel by user.roleSlug
4. Return a CurrentUser object with all fields including populated role
5. Attach convenience flags from the role:
   isAdminTier: role.isAdminTier,
   canAccessPhase2: role.canAccessPhase2,
   canInviteStaff: role.canInviteStaff,
   canManageResidents: role.canManageResidents

PART E — CREATE LIB/PERMISSIONS.TS

Export these helper functions (all accept CurrentUser):

requireAuth(user: CurrentUser | null): asserts user is CurrentUser
  — throws 401 if user is null

requireSuperAdmin(user: CurrentUser): void
  — throws 403 if !user.isWaikSuperAdmin

requireAdminTier(user: CurrentUser): void
  — throws 403 if !user.isAdminTier

requirePhase2Access(user: CurrentUser): void
  — throws 403 if !user.canAccessPhase2

requireFacility(user: CurrentUser, facilityId: string): void
  — throws 403 if user.facilityId !== facilityId AND !user.isWaikSuperAdmin

requireRole(user: CurrentUser, ...slugs: string[]): void
  — throws 403 if user.roleSlug not in slugs

Do not change any other application code.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/00-DATA-MODELS.md` documenting all four models
- Create `documentation/waik/01-PERMISSIONS.md` documenting the permission system
- Create `plan/pilot_1/phase_0_identity/task-00a-DONE.md`
