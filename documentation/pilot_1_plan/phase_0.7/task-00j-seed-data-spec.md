# Task 00j — Seed Data Specification and Definition (v2 — Approved)
## Phase: 0.7 — Development Seed Data
## Estimated Time: 2–3 hours (review and approval only — no code)
## Depends On: task-00a (models), task-00g (staff shell), task-00h (admin shell)
## Reviewed: April 2026 — fixes applied per peer review

---

## Why This Task Exists

The dashboard shells from Phase 0.6 show static placeholder content.
This task defines the real database records that replace it. Task 00k
writes the script that creates them.

The two tasks are separated deliberately: the definition must be approved
before the script is written. Once the seed script runs and becomes the
development baseline, changing the data means re-running everything.

---

## Pre-Flight: Model Changes Required Before Task 00k Runs

Two schema changes must be applied to `incident.model.ts` before the
seed script is written. These are small changes — one enum update and
one subdocument extension — but they are blockers. The seed script must
target the correct shapes.

### Change 1 — Phase Enum (4 values, not 3)

The current model has `phase_1_immediate | phase_2_investigation | closed`.
This spec requires four values to represent what the admin dashboard needs
to distinguish:

```typescript
// UPDATE incident.model.ts phase field:
phase: {
  type: String,
  enum: [
    "phase_1_in_progress",  // nurse actively answering questions
    "phase_1_complete",     // Phase 1 signed and sealed, Phase 2 not yet claimed
    "phase_2_in_progress",  // DON claimed, investigation active
    "closed"                // both signatures recorded, locked
  ],
  required: true
}
```

Why this matters: `phase_1_in_progress` and `phase_1_complete` display
completely differently on the admin dashboard. The first is a red alert
(nurse hasn't finished). The second is a yellow awaiting-claim card (nurse
finished, DON hasn't started). Collapsing them into one value means the
dashboard cannot distinguish them without adding brittle boolean flags.

### Change 2 — IDT Team Subdocument Extension

The current `idtTeam` array items need these additional fields:

```typescript
// UPDATE incident.model.ts idtTeam array subdocument:
idtTeam: [{
  userId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  questionSent: { type: String },         // ← ADD: the question text
  questionSentAt: { type: Date },         // ← ADD: when question was sent
  response: { type: String },             // ← ADD: IDT member's response text
  respondedAt: { type: Date },            // ← ADD: when they responded
  status: {
    type: String,
    enum: ["pending", "answered"],
    default: "pending"
  }
}]
```

---

## The Complete Seed Data Universe

Every ID is stable. Running the seed script twice produces the same
documents with the same IDs — idempotency is enforced by ID lookup.

---

## ORGANIZATION

```
id:               "org-sunrise-001"
name:             "Sunrise Senior Living Minnesota"
type:             "independent"
plan:             "pilot"
primaryContact:
  name:           "Patricia Walsh"
  email:          "p.walsh@sunrisemn.com"
  phone:          "612-555-0100"
createdBySuperId: [resolved at runtime — lookup gerard@waik.care by email]
isActive:         true
```

---

## FACILITY

```
id:               "fac-sunrise-mpls-001"
organizationId:   "org-sunrise-001"
name:             "Sunrise Minneapolis — Uptown"
type:             "alf"
state:            "MN"
bedCount:         85
plan:             "pilot"
phaseMode:        "two_phase"
onboardingDate:   daysAgo(30)
primaryContact:
  name:           "Patricia Walsh"
  email:          "p.walsh@sunrisemn.com"
  phone:          "612-555-0100"
reportingConfig:
  mandatedReportingWindowHours: 2
completionThresholds:
  fall:               75
  medication_error:   80
  resident_conflict:  70
  wound_injury:       80
  abuse_neglect:      90
units:
  - "Wing A — East"
  - "Wing B — West"
  - "Memory Care Unit"
  - "Skilled Nursing"
```

---

## STAFF USERS (8 total)

All: facilityId = "fac-sunrise-mpls-001", organizationId = "org-sunrise-001"
All: mustChangePassword = false, isActive = true
Clerk password for all seed users: `WaiK@Seed2026!`
These are development-only accounts — never promoted to production.

```
USER 1 — Administrator
  id:            "user-admin-001"
  firstName:     "Patricia"
  lastName:      "Walsh"
  email:         "p.walsh@sunrisemn.com"
  roleSlug:      "administrator"
  deviceType:    "work"
  lastLoginAt:   daysAgo(2)

USER 2 — Director of Nursing
  id:            "user-don-001"
  firstName:     "Sarah"
  lastName:      "Kim"
  email:         "s.kim@sunrisemn.com"
  roleSlug:      "director_of_nursing"
  deviceType:    "work"
  lastLoginAt:   daysAgo(1)

USER 3 — Head Nurse
  id:            "user-hn-001"
  firstName:     "James"
  lastName:      "Wilson"
  email:         "j.wilson@sunrisemn.com"
  roleSlug:      "head_nurse"
  deviceType:    "work"
  lastLoginAt:   daysAgo(3)

USER 4 — RN (primary reporter — Maria Torres)
  id:            "user-rn-001"
  firstName:     "Maria"
  lastName:      "Torres"
  email:         "m.torres@sunrisemn.com"
  roleSlug:      "rn"
  deviceType:    "personal"
  lastLoginAt:   hoursAgo(6)
  selectedUnit:  "Wing A — East"
  selectedUnitDate: [today YYYY-MM-DD]

USER 5 — RN (secondary reporter — DeShawn Carter)
  id:            "user-rn-002"
  firstName:     "DeShawn"
  lastName:      "Carter"
  email:         "d.carter@sunrisemn.com"
  roleSlug:      "rn"
  deviceType:    "personal"
  lastLoginAt:   daysAgo(1)

USER 6 — CNA
  id:            "user-cna-001"
  firstName:     "Linda"
  lastName:      "Osei"
  email:         "l.osei@sunrisemn.com"
  roleSlug:      "cna"
  deviceType:    "personal"
  lastLoginAt:   hoursAgo(4)

USER 7 — Physical Therapist
  id:            "user-pt-001"
  firstName:     "Kevin"
  lastName:      "Park"
  email:         "k.park@sunrisemn.com"
  roleSlug:      "physical_therapist"
  deviceType:    "work"
  lastLoginAt:   daysAgo(2)

USER 8 — Dietician
  id:            "user-diet-001"
  firstName:     "Amara"
  lastName:      "Diallo"
  email:         "a.diallo@sunrisemn.com"
  roleSlug:      "dietician"
  deviceType:    "personal"
  lastLoginAt:   daysAgo(1)
```

---

## RESIDENTS (5 total)

All: facilityId = "fac-sunrise-mpls-001", status = "active"

⚠️  NOTE: Resident 4 is James OKAFOR — not James Wilson.
    James Wilson is already the head nurse (user-hn-001).
    Having identical names in both staff and residents causes confusion
    in logs, UIs, and test output. The name was changed in this v2.

```
RESIDENT 1
  id:                  "res-001"
  firstName:           "Margaret"
  lastName:            "Chen"
  roomNumber:          "102"
  wing:                "Memory Care Unit"
  careLevel:           "memory_care"
  dateOfBirth:         yearsAgo(84)
  admissionDate:       daysAgo(425)   — 14 months ago
  primaryDiagnosis:    "Moderate Alzheimer's disease"
  secondaryDiagnoses:  ["Osteoporosis", "Hypertension"]
  primaryPhysician:    "Dr. Anita Patel"

RESIDENT 2
  id:                  "res-002"
  firstName:           "Robert"
  lastName:            "Johnson"
  roomNumber:          "204"
  wing:                "Skilled Nursing"
  careLevel:           "skilled_nursing"
  dateOfBirth:         yearsAgo(78)
  admissionDate:       daysAgo(182)   — 6 months ago
  primaryDiagnosis:    "COPD with acute exacerbation"
  secondaryDiagnoses:  ["Type 2 Diabetes", "Peripheral neuropathy"]
  primaryPhysician:    "Dr. Marcus Webb"

RESIDENT 3
  id:                  "res-003"
  firstName:           "Dorothy"
  lastName:            "Martinez"
  roomNumber:          "306"
  wing:                "Wing A — East"
  careLevel:           "assisted"
  dateOfBirth:         yearsAgo(91)
  admissionDate:       daysAgo(730)   — 2 years ago
  primaryDiagnosis:    "Mild vascular dementia"
  secondaryDiagnoses:  ["Atrial fibrillation", "Arthritis"]
  primaryPhysician:    "Dr. Anita Patel"

RESIDENT 4  ← NAME CHANGED FROM JAMES WILSON TO JAMES OKAFOR
  id:                  "res-004"
  firstName:           "James"
  lastName:            "Okafor"
  roomNumber:          "411"
  wing:                "Wing B — West"
  careLevel:           "skilled_nursing"
  dateOfBirth:         yearsAgo(67)
  admissionDate:       daysAgo(90)    — 3 months ago
  primaryDiagnosis:    "CVA — left hemisphere stroke"
  secondaryDiagnoses:  ["Dysphagia", "Depression", "Hypertension"]
  primaryPhysician:    "Dr. Marcus Webb"

RESIDENT 5
  id:                  "res-005"
  firstName:           "Helen"
  lastName:            "Thompson"
  roomNumber:          "515"
  wing:                "Skilled Nursing"
  careLevel:           "skilled_nursing"
  dateOfBirth:         yearsAgo(88)
  admissionDate:       daysAgo(334)   — 11 months ago
  primaryDiagnosis:    "Congestive heart failure"
  secondaryDiagnoses:  ["Fall risk — high", "Chronic kidney disease stage 3"]
  primaryPhysician:    "Dr. Anita Patel"
```

---

## INCIDENTS (10 total)

Phase distribution: 3 in progress / 2 complete / 3 phase 2 / 2 closed
(All four dashboard-relevant phase buckets are covered.)

```
INCIDENT 1 — phase_1_in_progress (low completeness)
  id:               "inc-001"
  residentId:       "res-001"
  residentRoom:     "102"
  incidentType:     "fall"
  location:         "Bathroom — beside toilet"
  incidentDate:     [today]
  incidentTime:     "06:15"
  reportedById:     "user-cna-001"
  reportedByName:   "Linda Osei"
  reportedByRole:   "cna"
  hasInjury:        false
  witnessesPresent: false
  phase:            "phase_1_in_progress"
  startedAt:        hoursAgo(5)
  completenessScore:            42
  completenessAtTier1Complete:  38
  tier2QuestionsGenerated:      12
  questionsAnswered:            4
  questionsDeferred:            2
  — Dashboard note: Linda has 6 unanswered questions. Shows in
    Pending Questions for Linda only.

INCIDENT 2 — phase_1_in_progress (medium completeness)
  id:               "inc-002"
  residentId:       "res-003"
  residentRoom:     "306"
  incidentType:     "medication_error"
  location:         "Room 306"
  incidentDate:     [today]
  incidentTime:     "08:30"
  reportedById:     "user-rn-002"
  reportedByName:   "DeShawn Carter"
  reportedByRole:   "rn"
  hasInjury:        false
  witnessesPresent: true
  phase:            "phase_1_in_progress"
  startedAt:        hoursAgo(3)
  completenessScore:            67
  tier2QuestionsGenerated:      8
  questionsAnswered:            5
  questionsDeferred:            1
  — Dashboard note: DeShawn has 3 unanswered questions.

INCIDENT 3 — phase_1_in_progress (high completeness, INJURY FLAGGED)
  id:               "inc-003"
  residentId:       "res-005"
  residentRoom:     "515"
  incidentType:     "fall"
  location:         "Hallway near nursing station"
  incidentDate:     [today]
  incidentTime:     "11:45"
  reportedById:     "user-rn-001"
  reportedByName:   "Maria Torres"
  reportedByRole:   "rn"
  hasInjury:        true
  injuryDescription: "Small abrasion on left knee — skin tear"
  witnessesPresent: true
  phase:            "phase_1_in_progress"
  startedAt:        hoursAgo(1)
  completenessScore:            88
  tier2QuestionsGenerated:      6
  questionsAnswered:            5
  questionsDeferred:            0
  — Dashboard note: hasInjury=true AND in_progress → RED ALERT on admin
    Maria has 1 closing question remaining → shows in her Pending Questions

INCIDENT 4 — phase_1_complete (INJURY FLAGGED — awaiting claim)
  id:               "inc-004"
  residentId:       "res-002"
  residentRoom:     "204"
  incidentType:     "fall"
  location:         "Room 204 — bedside"
  incidentDate:     [yesterday]
  incidentTime:     "22:15"
  reportedById:     "user-rn-001"
  reportedByName:   "Maria Torres"
  reportedByRole:   "rn"
  hasInjury:        true
  injuryDescription: "Hip pain reported — no visible bruising"
  witnessesPresent: false
  phase:            "phase_1_complete"
  startedAt:        hoursAgo(14)
  phase1SignedAt:   hoursAgo(5)
  completenessAtSignoff: 82
  completenessScore:     82
  — Dashboard note: hasInjury=true AND phase_1_complete → RED ALERT

INCIDENT 5 — phase_1_complete (no injury — awaiting claim)
  id:               "inc-005"
  residentId:       "res-004"
  residentRoom:     "411"
  incidentType:     "resident_conflict"
  location:         "Dining Room"
  incidentDate:     [yesterday]
  incidentTime:     "12:30"
  reportedById:     "user-rn-002"
  reportedByName:   "DeShawn Carter"
  reportedByRole:   "rn"
  hasInjury:        false
  witnessesPresent: true
  phase:            "phase_1_complete"
  startedAt:        hoursAgo(26)
  phase1SignedAt:   hoursAgo(3)
  completenessAtSignoff: 76
  completenessScore:     76
  — Dashboard note: no injury AND phase_1_complete → YELLOW card

INCIDENT 6 — phase_2_in_progress (28 hours remaining — AMBER clock)
  id:               "inc-006"
  residentId:       "res-002"
  residentRoom:     "204"
  incidentType:     "fall"
  location:         "Bathroom"
  incidentDate:     daysAgo(3)
  incidentTime:     "14:00"
  reportedById:     "user-rn-001"
  reportedByName:   "Maria Torres"
  reportedByRole:   "rn"
  hasInjury:        false
  witnessesPresent: false
  phase:            "phase_2_in_progress"
  startedAt:        daysAgo(3)
  phase1SignedAt:   hoursAgo(20)
  completenessAtSignoff: 82
  completenessScore:     82
  investigatorId:   "user-don-001"
  investigatorName: "Dr. Sarah Kim"
  idtTeam:
    - userId:         "user-pt-001"
      name:           "Kevin Park"
      role:           "physical_therapist"
      status:         "pending"
      questionSent:   "Did the resident attempt the transfer without staff assist?"
      questionSentAt: hoursAgo(18)
      response:       null
      respondedAt:    null
      — OVERDUE: 18 hours without response
    - userId:         "user-diet-001"
      name:           "Amara Diallo"
      role:           "dietician"
      status:         "answered"
      questionSent:   "Any recent medication changes that could affect balance?"
      questionSentAt: hoursAgo(16)
      response:       "No medication changes in past 30 days. Current regimen reviewed — no balance-affecting medications identified."
      respondedAt:    hoursAgo(10)
  phase2Sections:
    contributingFactors:
      status:  "complete"
      factors: ["Environmental Hazard", "Resident Behavior"]
      notes:   "Wet floor surface — mat not in place"
      completedAt:  hoursAgo(15)
      completedBy:  "user-don-001"
    rootCause:
      status:      "in_progress"
      description: "Resident attempted independent transfer"
    interventionReview: { status: "not_started" }
    newIntervention:    { status: "not_started" }
  — Clock: phase1SignedAt 20hrs ago → 28hrs remaining → AMBER

INCIDENT 7 — phase_2_in_progress (5 hours remaining — RED clock, READY TO LOCK)
  id:               "inc-007"
  residentId:       "res-003"
  residentRoom:     "306"
  incidentType:     "fall"
  location:         "Room 306 — beside bed"
  incidentDate:     daysAgo(4)
  incidentTime:     "02:30"
  reportedById:     "user-rn-001"
  reportedByName:   "Maria Torres"
  reportedByRole:   "rn"
  hasInjury:        false
  witnessesPresent: false
  phase:            "phase_2_in_progress"
  startedAt:        daysAgo(4)
  phase1SignedAt:   hoursAgo(43)
  completenessAtSignoff: 91
  completenessScore:     91
  investigatorId:   "user-don-001"
  investigatorName: "Dr. Sarah Kim"
  idtTeam:
    - userId:         "user-pt-001"
      name:           "Kevin Park"
      role:           "physical_therapist"
      status:         "answered"
      questionSent:   "Review current PT plan — is the walker being used consistently?"
      questionSentAt: hoursAgo(40)
      response:       "Walker in use but resident frequently refuses. Recommend PT session 3x weekly and family education on fall risk."
      respondedAt:    hoursAgo(30)
  phase2Sections:
    contributingFactors:
      status:      "complete"
      factors:     ["Resident Behavior", "Cognitive Decline"]
      completedAt: hoursAgo(35)
      completedBy: "user-don-001"
    rootCause:
      status:      "complete"
      description: "Resident with moderate dementia ambulating independently at night without call light use. Cognitive impairment prevents consistent adherence to fall prevention protocol."
      completedAt: hoursAgo(32)
      completedBy: "user-don-001"
    interventionReview:
      status:      "complete"
      completedAt: hoursAgo(28)
      completedBy: "user-don-001"
    newIntervention:
      status:      "complete"
      interventions:
        - description: "Bed alarm activated 9pm–6am"
          department: "nursing"
          type:        "permanent"
          startDate:   daysAgo(4)
        - description: "PT 3x weekly — walker training and strengthening"
          department: "therapy"
          type:        "permanent"
          startDate:   daysAgo(4)
      completedAt: hoursAgo(25)
      completedBy: "user-don-001"
  — Clock: phase1SignedAt 43hrs ago → 5hrs remaining → RED
  — All four sections complete → READY TO LOCK banner shows

INCIDENT 8 — phase_2_in_progress (44 hours remaining — GRAY clock)
  id:               "inc-008"
  residentId:       "res-004"
  residentRoom:     "411"
  incidentType:     "wound_injury"
  location:         "Room 411 — during repositioning"
  incidentDate:     daysAgo(2)
  incidentTime:     "09:00"
  reportedById:     "user-rn-002"
  reportedByName:   "DeShawn Carter"
  reportedByRole:   "rn"
  hasInjury:        true
  injuryDescription: "Stage 2 pressure injury noted on sacrum during repositioning"
  witnessesPresent: false
  phase:            "phase_2_in_progress"
  startedAt:        daysAgo(2)
  phase1SignedAt:   hoursAgo(4)
  completenessAtSignoff: 79
  completenessScore:     79
  investigatorId:   "user-admin-001"
  investigatorName: "Patricia Walsh"
  idtTeam:          []
  phase2Sections:
    contributingFactors: { status: "not_started" }
    rootCause:           { status: "not_started" }
    interventionReview:  { status: "not_started" }
    newIntervention:     { status: "not_started" }
  — Clock: phase1SignedAt 4hrs ago → 44hrs remaining → GRAY

INCIDENT 9 — closed (15 days ago)
  id:               "inc-009"
  residentId:       "res-005"
  residentRoom:     "515"
  incidentType:     "fall"
  location:         "Room 515 — bathroom"
  incidentDate:     daysAgo(18)
  incidentTime:     "03:15"
  reportedById:     "user-rn-001"
  reportedByName:   "Maria Torres"
  reportedByRole:   "rn"
  hasInjury:        false
  witnessesPresent: false
  phase:            "closed"
  startedAt:        daysAgo(18)
  phase1SignedAt:   daysAgo(18)
  phase2LockedAt:   daysAgo(15)
  completenessAtSignoff: 93
  completenessScore:     93
  investigatorId:   "user-don-001"
  investigatorName: "Dr. Sarah Kim"
  signatures:
    don:           { name: "Dr. Sarah Kim", signedAt: daysAgo(15) }
    administrator: { name: "Patricia Walsh", signedAt: daysAgo(15) }
  phase2Sections:
    contributingFactors:
      status:  "complete"
      factors: ["Environmental Hazard", "Toileting Need"]
    rootCause:
      status:      "complete"
      description: "Resident ambulated to bathroom without call light activation. Non-slip mat absent from bathroom floor — removed during room cleaning and not replaced."
    interventionReview:
      status: "complete"
    newIntervention:
      status: "complete"
      interventions:
        - description: "Non-slip mat inspection added to daily room check"
          department: "nursing"
          type:        "permanent"
          startDate:   daysAgo(15)
        - description: "Gait belt use required for all bathroom transfers"
          department: "nursing"
          type:        "permanent"
          startDate:   daysAgo(15)

INCIDENT 10 — closed (23 days ago)
  id:               "inc-010"
  residentId:       "res-003"
  residentRoom:     "306"
  incidentType:     "medication_error"
  location:         "Medication room"
  incidentDate:     daysAgo(28)
  incidentTime:     "19:45"
  reportedById:     "user-rn-002"
  reportedByName:   "DeShawn Carter"
  reportedByRole:   "rn"
  hasInjury:        false
  witnessesPresent: true
  phase:            "closed"
  startedAt:        daysAgo(28)
  phase1SignedAt:   daysAgo(28)
  phase2LockedAt:   daysAgo(23)
  completenessAtSignoff: 71
  completenessScore:     71
  investigatorId:   "user-don-001"
  investigatorName: "Dr. Sarah Kim"
  signatures:
    don:           { name: "Dr. Sarah Kim", signedAt: daysAgo(23) }
    administrator: { name: "Patricia Walsh", signedAt: daysAgo(23) }
  phase2Sections:
    contributingFactors:
      status:  "complete"
      factors: ["Staffing Issue"]
    rootCause:
      status:      "complete"
      description: "Double-check protocol not followed during high-census evening. Single nurse dispensing medications without confirmation step."
    interventionReview: { status: "complete" }
    newIntervention:    { status: "complete" }
```

---

## INTERVENTIONS (4 active, 1 removed)

```
INTERVENTION 1 — Active (pre-dates WAiK)
  id:                   "int-001"
  facilityId:           "fac-sunrise-mpls-001"
  residentId:           "res-001"
  residentRoom:         "102"
  description:          "Bed alarm activated every night 8pm–7am"
  department:           "nursing"
  type:                 "permanent"
  isActive:             true
  placedAt:             daysAgo(182)
  triggeringIncidentId: null

INTERVENTION 2 — Active (pre-dates WAiK)
  id:                   "int-002"
  residentId:           "res-002"
  residentRoom:         "204"
  description:          "Two-person assist required for all transfers and ambulation"
  department:           "nursing"
  type:                 "permanent"
  isActive:             true
  placedAt:             daysAgo(152)
  triggeringIncidentId: null

INTERVENTION 3 — Active (placed after INC-009)
  id:                   "int-003"
  residentId:           "res-005"
  residentRoom:         "515"
  description:          "Non-slip mat inspection added to daily room check protocol"
  department:           "nursing"
  type:                 "permanent"
  isActive:             true
  placedAt:             daysAgo(15)
  triggeringIncidentId: "inc-009"

INTERVENTION 4 — Active (placed after INC-009)
  id:                   "int-004"
  residentId:           "res-005"
  residentRoom:         "515"
  description:          "Gait belt use required for all bathroom transfers"
  department:           "nursing"
  type:                 "permanent"
  isActive:             true
  placedAt:             daysAgo(15)
  triggeringIncidentId: "inc-009"

INTERVENTION 5 — Removed
  id:                   "int-005"
  residentId:           "res-001"
  residentRoom:         "102"
  description:          "Physical restraint — lap belt during meals (discontinued)"
  department:           "nursing"
  type:                 "temporary"
  isActive:             false
  placedAt:             daysAgo(240)
  removedAt:            daysAgo(182)
  notes:                "Discontinued per resident rights review — replaced with bed alarm monitoring protocol"
  triggeringIncidentId: null
```

---

## ASSESSMENTS (3 total)

⚠️  NOTE: Before seeding assessments, verify that
`backend/src/models/assessment.model.ts` exists.
If it does not exist: the seed script logs a warning and skips
this section rather than crashing.

```
ASSESSMENT 1 — Completed Activity Assessment
  id:                "assess-001"
  facilityId:        "fac-sunrise-mpls-001"
  residentId:        "res-004"   (James Okafor, Room 411)
  residentRoom:      "411"
  assessmentType:    "activity"
  conductedById:     "user-rn-001"
  conductedByName:   "Maria Torres"
  conductedAt:       daysAgo(21)
  completenessScore: 84
  status:            "completed"
  nextDueAt:         daysFromNow(9)

ASSESSMENT 2 — Completed Dietary Assessment
  id:                "assess-002"
  residentId:        "res-004"   (James Okafor, Room 411)
  residentRoom:      "411"
  assessmentType:    "dietary"
  conductedById:     "user-diet-001"
  conductedByName:   "Amara Diallo"
  conductedAt:       daysAgo(18)
  completenessScore: 91
  status:            "completed"
  nextDueAt:         daysFromNow(12)

ASSESSMENT 3 — Due Tomorrow (creates urgency in dashboards)
  id:                "assess-003"
  residentId:        "res-002"   (Robert Johnson, Room 204)
  residentRoom:      "204"
  assessmentType:    "activity"
  conductedById:     "user-rn-001"
  conductedByName:   "Maria Torres"
  conductedAt:       daysAgo(29)
  completenessScore: 77
  status:            "completed"
  nextDueAt:         daysFromNow(1)
```

---

## PENDING QUESTIONS RULE (authoritative definition)

Pending questions on the staff dashboard shows incidents where:
  1. `reportedById === currentUser.userId`  AND
  2. The incident has unanswered Tier 2 questions OR unanswered closing questions
  3. `phase === "phase_1_in_progress"`

Staff only see their own incidents. They never see another nurse's
pending questions, even within the same facility.

Applied to seed data:
  Maria Torres sees: INC-003 (her report, 1 closing question, 88%, 1hr ago)
  Maria does NOT see: INC-001 (Linda's), INC-002 (DeShawn's)
  Linda Osei sees:   INC-001 (her report, 6 questions, 42%, 5hrs ago)
  DeShawn Carter sees: INC-002 (his report, 3 questions, 67%, 3hrs ago)

---

## WHAT EACH DASHBOARD SHOWS

**Staff dashboard — Maria Torres (RN):**
- Hero: Report Incident button. No amber "continue" banner (INC-003
  has pending questions but is not at tier2_board state — Maria is
  in the closing questions step. Show the pending questions card instead.)
- Pending Questions: INC-003 — Room 515 Fall — 1 question — 88% — 1 hour ago
- Recent Reports (Maria's only): INC-003, INC-004, INC-006, INC-007, INC-009
- Upcoming Assessments: ASSESS-003 — Room 204 Activity — due tomorrow
- Performance: avg of INC-004(82), INC-006(82), INC-007(91), INC-009(93) = 87%
- Streak: INC-009(93%) INC-007(91%) INC-006(82%) INC-004(82%) = 🔥 4-report streak

**Admin dashboard — Dr. Sarah Kim (DON):**
- Red Alerts: INC-003 (injury + in_progress), INC-004 (injury + complete)
- Yellow Awaiting Claim: INC-005 (no injury, complete, 3hrs since signed)
- Active Investigations tab:
    INC-006 — 204 Fall — Phase 2 — 82% — 28h remaining (AMBER)
    INC-007 — 306 Fall — Phase 2 — 91% — 5h remaining (RED) — READY TO LOCK
    INC-008 — 411 Wound — Phase 2 — 79% — 44h remaining (GRAY)
- Overdue IDT Tasks: INC-006 Kevin Park — 18 hours without response
- Closed tab: INC-009 (93%, 3 days to close), INC-010 (71%, 5 days to close)
- Quick stats: 10 incidents, 82% avg completeness, 4 days avg to close

**Super admin dashboard — Gerard:**
- 1 organization: Sunrise Senior Living Minnesota
- 1 facility: Sunrise Minneapolis — Uptown
- 8 staff members
- 10 incidents this month, avg completeness 82%
- Quick stats numbers are validated against MongoDB aggregation queries,
  not hardcoded — the seed data produces these numbers automatically.

---

## SEED FIELD → MONGOOSE PATH MAPPING APPENDIX

This table resolves every non-obvious mapping between the seed spec
and the actual Mongoose model paths. Task 00k must use these paths.

| Seed Spec Field             | Mongoose Path on IncidentModel            | Notes                                    |
|-----------------------------|-------------------------------------------|------------------------------------------|
| phase "phase_1_in_progress" | incident.phase = "phase_1_in_progress"    | Enum updated per pre-flight Change 1     |
| phase "phase_1_complete"    | incident.phase = "phase_1_complete"       | New value — was "phase_1_immediate"      |
| phase "phase_2_in_progress" | incident.phase = "phase_2_in_progress"    | Was "phase_2_investigation"              |
| phase "closed"              | incident.phase = "closed"                 | Unchanged                                |
| completenessScore           | incident.completenessScore                | Live score during reporting              |
| completenessAtSignoff       | incident.completenessAtSignoff            | Locked at Phase 1 sign-off               |
| phase1SignedAt              | incident.phaseTransitionTimestamps.phase1Signed | Nested in phaseTransitionTimestamps |
| phase2LockedAt              | incident.phaseTransitionTimestamps.phase2Locked | Nested in phaseTransitionTimestamps |
| startedAt                   | incident.phaseTransitionTimestamps.phase1Started | Nested                             |
| investigatorId              | incident.investigatorId                   | Top-level string field                   |
| investigatorName            | incident.investigatorName                 | Top-level string field                   |
| signatures.don              | incident.investigation.signatures.don     | Nested in investigation subdocument      |
| signatures.administrator    | incident.investigation.signatures.administrator | Same                               |
| idtTeam[].questionSent      | incident.idtTeam[].questionSent           | Added per pre-flight Change 2            |
| idtTeam[].questionSentAt    | incident.idtTeam[].questionSentAt         | Added per pre-flight Change 2            |
| idtTeam[].response          | incident.idtTeam[].response               | Added per pre-flight Change 2            |
| idtTeam[].respondedAt       | incident.idtTeam[].respondedAt            | Added per pre-flight Change 2            |
| idtTeam[].status            | incident.idtTeam[].status                 | "pending" or "answered"                  |
| phase2Sections.*.status     | incident.phase2Sections.*.status          | "not_started" / "in_progress" / "complete" |
| phase2Sections.*.completedAt| incident.phase2Sections.*.completedAt     | Date when section marked complete        |
| phase2Sections.*.completedBy| incident.phase2Sections.*.completedBy     | userId of who completed the section      |

| Seed Spec Field             | Mongoose Path on UserModel                | Notes                                    |
|-----------------------------|-------------------------------------------|------------------------------------------|
| clerkUserId                 | user.clerkUserId                          | Resolved at Clerk create time            |
| roleSlug                    | user.roleSlug                             | References RoleModel.slug                |
| selectedUnit                | user.selectedUnit                         | String — wing name chosen at login       |
| selectedUnitDate            | user.selectedUnitDate                     | YYYY-MM-DD string — keyed to today       |

| Seed Spec Field             | Mongoose Path on InterventionModel        | Notes                                    |
|-----------------------------|-------------------------------------------|------------------------------------------|
| triggeringIncidentId        | intervention.triggeringIncidentId         | Null for pre-WAiK interventions          |
| isActive: false             | intervention.isActive = false             | Also set intervention.removedAt          |

---

## Success Criteria (this task — definition and approval only)

- [ ] Pre-flight model changes (phase enum + idtTeam extension) documented
      and flagged for task-00a update before task-00k runs
- [ ] Resident 4 confirmed as James OKAFOR (not James Wilson)
- [ ] James Wilson name collision confirmed resolved
- [ ] All four dashboard-relevant phase buckets covered:
      phase_1_in_progress (3), phase_1_complete (2),
      phase_2_in_progress (3), closed (2) — total 10 ✓
- [ ] Pending questions rule is explicitly defined and unambiguous
- [ ] Staff dashboard data (Maria's perspective) is accurate per the rule
- [ ] Admin dashboard: red alerts, yellow cards, all three clock colors covered
- [ ] Super admin: counts are correct (1 org, 1 facility, 8 staff, 10 incidents)
- [ ] Mapping appendix covers every non-obvious field
- [ ] Assessment seeding is conditional on model existence
- [ ] createdBySuperId is resolved at runtime, not hardcoded
- [ ] Seed data approved — task 00k can now be written

---

## Post-Task Documentation Update

After approval:
- This document replaces the original task-00j as the authoritative seed spec
- Create `plan/pilot_1/phase_0.7/task-00j-DONE.md`
