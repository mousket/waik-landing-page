# Task 02 — Multi-Tenant Data Isolation + Complete Data Model
## Phase: 1 — Foundation & Auth
## Estimated Time: 4–5 hours
## Depends On: task-01 (ClerkJS must be installed and working)

---

## Why This Task Exists

Authentication (task-01) verifies who you are. This task does two things
simultaneously: it ensures you can only see your facility's data, and it
establishes the complete data model that every subsequent task builds on.

The data isolation piece is non-negotiable. `getIncidents()` currently returns
ALL incidents from ALL facilities. One pilot community seeing another's resident
data ends the business. Fix this before any feature work begins.

The data model piece is equally important. This is the only moment to add fields
cleanly before the schema hardens. Every analytics metric Scott specified, every
new model from the second co-founder meeting, and every field the UI
specification requires gets added here. Adding them later means migrations.

---

## Context Files

- `lib/db.ts` — add facilityId to all queries
- `lib/types.ts` — expand UserRole, Incident interface, add new interfaces
- `backend/src/models/incident.model.ts` — new analytics fields + compound indexes
- `backend/src/models/user.model.ts` — facilityId, orgId, deviceType, expanded roles
- `app/api/incidents/route.ts` — getCurrentUser() + facilityId filtering
- `app/api/incidents/[id]/route.ts` — facilityId ownership check
- `lib/auth.ts` — already created in task-01

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] `getIncidents()` requires `facilityId` — will not compile without it
- [ ] `getIncidentById()` returns null if facilityId does not match
- [ ] `GET /api/incidents` returns only current user's facility incidents
- [ ] `GET /api/incidents/[id]` returns 403 for wrong-facility request
- [ ] UserRole includes all 10 roles
- [ ] IncidentModel has all analytics metric fields
- [ ] IncidentModel has Phase2Sections subdocument schema
- [ ] IncidentModel has auditTrail array field
- [ ] InterventionModel exists with all required fields
- [ ] UserModel has deviceType field
- [ ] Three compound indexes exist on IncidentModel
- [ ] `lib/db-facility.ts` exists and exports `facilityDb(facilityId)`

---

## Test Cases

```
TEST 1 — Cross-facility isolation
  Setup: Create incidents in facilityId "fac-a" and "fac-b" directly in MongoDB
  Action: GET /api/incidents with authenticated token for "fac-a"
  Expected: Only "fac-a" incidents returned
  Pass/Fail: ___

TEST 2 — Wrong facility returns 403
  Setup: Create incident with facilityId "fac-b"
  Action: GET /api/incidents/[that-id] with token for "fac-a"
  Expected: HTTP 403
  Pass/Fail: ___

TEST 3 — Create incident inherits facilityId from auth
  Action: POST /api/incidents with valid body (no facilityId in body)
  Expected: Incident created with facilityId from authenticated session
  Pass/Fail: ___

TEST 4 — TypeScript enforces facilityId on getIncidents
  Action: Call getIncidents() without facilityId argument in any .ts file
  Expected: TypeScript compilation error
  Pass/Fail: ___

TEST 5 — Analytics fields exist on created incident
  Action: Create incident, fetch from MongoDB directly
  Expected: tier2QuestionsGenerated, questionsAnswered, activeDataCollectionSeconds,
            completenessAtTier1Complete, completenessAtSignoff all exist (default 0)
  Pass/Fail: ___

TEST 6 — Phase2Sections subdocument initializes correctly
  Action: Create incident, inspect phase2Sections field
  Expected: { contributingFactors: { status: 'not_started' }, rootCause: {...}, ... }
  Pass/Fail: ___

TEST 7 — InterventionModel saves and retrieves
  Action: Create an Intervention document linked to a residentId
  Expected: Document saved with all required fields, retrievable by residentId + facilityId
  Pass/Fail: ___

TEST 8 — UserModel accepts deviceType
  Action: Create user with deviceType: 'personal'
  Expected: Saves without error. deviceType: 'work' also accepted.
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14 with ClerkJS auth installed. This task does two
things: enforces multi-tenant data isolation AND establishes the complete data
model for the entire application.

PART A — MULTI-TENANT DATA ISOLATION

1. Update lib/db.ts — add facilityId to every query:
   - getIncidents(facilityId: string)
   - getIncidentsByStaffId(staffId: string, facilityId: string)
   - createIncidentFromReport(input) — facilityId required in input type
   - getIncidentById(id: string, facilityId: string) — return null if no match
   - All other incident queries — add facilityId parameter and enforce it

2. Update ALL API route handlers under app/api/:
   - Call getCurrentUser() at start of every handler
   - Return 401 if not authenticated
   - Pass facilityId to all db queries
   - Return 403 if resource belongs to different facility

3. Create lib/db-facility.ts:
   export function facilityDb(facilityId: string) {
     return {
       getIncidents: () => getIncidents(facilityId),
       getIncidentById: (id: string) => getIncidentById(id, facilityId),
       createIncidentFromReport: (input: Omit<CreateIncidentInput, 'facilityId'>) =>
         createIncidentFromReport({ ...input, facilityId }),
     }
   }

PART B — COMPLETE DATA MODEL

4. Update lib/types.ts:
   - UserRole: "owner" | "administrator" | "director_of_nursing" | "head_nurse" |
     "rn" | "lpn" | "cna" | "staff" | "physical_therapist" | "dietician"
   - Incident interface: add facilityId, orgId, incidentType, location, incidentDate,
     incidentTime, witnessesPresent, hasInjury, injuryDescription,
     phase2Sections, auditTrail, analytics fields (see below)
   - Add Phase2SectionStatus type: "not_started" | "in_progress" | "complete"
   - Add DeviceType type: "personal" | "work"

5. Update backend/src/models/incident.model.ts:

   ADD ANALYTICS FIELDS (all Number, default 0):
   tier2QuestionsGenerated    — how many Tier 2 questions the gap analysis created
   questionsAnswered          — how many were actually answered by staff
   questionsDeferred          — how many were deferred via Answer Later
   questionsMarkedUnknown     — how many were answered "I don't know"
   activeDataCollectionSeconds — total recording + typing time (not session time)
   completenessAtTier1Complete — completeness % when Tier 1 was finished
   completenessAtSignoff       — completeness % at Phase 1 sign-off
   dataPointsPerQuestion: [{ questionId: String, dataPointsCovered: Number }]
   phaseTransitionTimestamps: {
     phase1Started: Date,
     tier1Complete: Date,
     tier2Started: Date,
     phase1Signed: Date,
     phase2Claimed: Date,
     phase2Locked: Date
   }

   ADD PHASE 2 SECTIONS SUBDOCUMENT:
   phase2Sections: {
     contributingFactors: {
       status: { type: String, enum: ['not_started','in_progress','complete'], default: 'not_started' },
       factors: [String],
       notes: String,
       completedAt: Date,
       completedBy: String
     },
     rootCause: {
       status: { type: String, enum: ['not_started','in_progress','complete'], default: 'not_started' },
       description: String,  // required, min 50 chars, before section can be marked complete
       completedAt: Date,
       completedBy: String
     },
     interventionReview: {
       status: { type: String, enum: ['not_started','in_progress','complete'], default: 'not_started' },
       reviewedInterventions: [{ interventionId: String, stillEffective: Boolean, notes: String }],
       completedAt: Date,
       completedBy: String
     },
     newIntervention: {
       status: { type: String, enum: ['not_started','in_progress','complete'], default: 'not_started' },
       interventions: [{
         description: String,
         department: { type: String, enum: ['nursing','dietary','therapy','activities','administration','multiple'] },
         type: { type: String, enum: ['temporary','permanent'] },
         startDate: Date,
         notes: String
       }],
       completedAt: Date,
       completedBy: String
     }
   }

   ADD AUDIT TRAIL ARRAY:
   auditTrail: [{
     action: { type: String, enum: ['locked','unlocked','relocked','phase_transitioned','signed'] },
     performedBy: String,
     performedByName: String,
     timestamp: Date,
     reason: String,  // required for unlock actions
     previousValue: String,
     newValue: String
   }]

   ADD COMPOUND INDEXES:
   IncidentSchema.index({ facilityId: 1, createdAt: -1 })
   IncidentSchema.index({ facilityId: 1, phase: 1 })
   IncidentSchema.index({ facilityId: 1, staffId: 1 })
   IncidentSchema.index({ facilityId: 1, 'phase2Sections.contributingFactors.status': 1 })

6. Create backend/src/models/intervention.model.ts:
   A resident-level intervention history model separate from incident records.
   Fields:
   id: String (required, unique)
   facilityId: String (required, indexed)
   residentId: String (required, indexed)
   residentRoom: String (required)
   description: String (required)
   department: { type: String, enum: ['nursing','dietary','therapy','activities','administration','multiple'] }
   type: { type: String, enum: ['temporary','permanent'] }
   isActive: Boolean (default true)
   placedAt: Date (required)
   removedAt: Date (optional — set when isActive becomes false)
   triggeringIncidentId: String (optional — which incident prompted this intervention)
   notes: String (optional)
   createdBy: String (userId who created it)
   facilityId: String (required, indexed)

   Add compound index: { facilityId: 1, residentId: 1, isActive: 1 }

7. Update backend/src/models/user.model.ts:
   - Add facilityId: String
   - Add orgId: String
   - Add isWaikSuperAdmin: Boolean (default false)
   - Add mustChangePassword: Boolean (default false)
   - Add deviceType: { type: String, enum: ['personal', 'work'], default: 'personal' }
   - Update role enum to match all 10 UserRole values

DO NOT change any agent logic, voice capture UI, or assessment code.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/02-DATABASE-SCHEMA.md` — document all new models and fields
- Update `documentation/waik/03-API-REFERENCE.md` — note facilityId enforcement
- Create `plan/pilot_1/phase_1/task-02-DONE.md`
