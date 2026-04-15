# Task 08 — Resident Story (Longitudinal Profile)
## Phase: 4 — Core Features
## Estimated Time: 6–8 hours
## Depends On: task-01, task-02, task-07

---

## Why This Task Exists

The Resident Story is what transforms WAiK from a reporting tool into a
clinical memory system. Every incident, every assessment, every note, every
observation about a person — organized in one place, always current, always
accessible. Without it, WAiK is a series of disconnected records that disappear
when staff leave. With it, the next nurse who cares for Mrs. Chen knows her
full history before the first interaction.

The MDS recommendations section turns the Resident Story into a revenue tool —
surfacing where the documented clinical picture supports enhanced reimbursement
that is currently being left unclaimed.

This task also builds the Intervention History panel — the standalone
intervention model created in task-02 now gets its UI. Scott was explicit in
the second co-founder meeting: one of the most painful parts of Phase 2
investigations today is that the DON has to leave the EHR, navigate to a
separate tab, and print a report just to see what interventions are currently
in place for a resident. WAiK surfaces this automatically, within the Phase 2
workspace, without any EHR integration. The Intervention History panel in the
Resident Story is the data source that makes that possible.

---

## Context Files

- `backend/src/models/incident.model.ts` — reference pattern
- `backend/src/models/assessment.model.ts` — created in task-07
- `backend/src/models/intervention.model.ts` — created in task-02, needs UI
- `app/admin/incidents/[id]/page.tsx` — reference for detail page patterns
- `lib/auth.ts` — role checking for visibility controls

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `backend/src/models/resident.model.ts` exists with all required fields
- [ ] `backend/src/models/note.model.ts` exists with all required fields
- [ ] `backend/src/models/attachment.model.ts` exists with all required fields
- [ ] `GET /api/residents?facilityId=X` returns facility-scoped list
- [ ] `POST /api/residents` creates with facilityId from auth
- [ ] `GET /api/residents/[id]` returns full profile with linked records
- [ ] Notes with `visibility: "admin_only"` stripped from staff-role responses
- [ ] Flagged notes appear prominently in Overview tab
- [ ] MDS recommendations endpoint returns LLM-generated suggestions
- [ ] Resident Story page shows all 4 tabs with correct data
- [ ] Intervention History panel shows on Overview tab
- [ ] Intervention History shows: description, date placed, department, active/removed status
- [ ] `POST /api/residents/[id]/interventions` creates intervention linked to resident
- [ ] `PATCH /api/residents/[id]/interventions/[iid]` updates isActive status
- [ ] `GET /api/residents/[id]/interventions` returns all interventions for resident
- [ ] "Add Observation" modal saves note correctly

---

## Test Cases

```
TEST 1 — Resident creation with facilityId from auth
  Action: POST /api/residents { firstName: "Maria", lastName: "Chen",
          roomNumber: "204", careLevel: "assisted" }
  Expected: Resident created with facilityId from authenticated session
  Pass/Fail: ___

TEST 2 — Resident list is facility-scoped
  Setup: Create residents in two facilityIds
  Action: GET /api/residents?facilityId=facility-a
  Expected: Only facility-a residents returned
  Pass/Fail: ___

TEST 3 — Admin-only note hidden from staff
  Setup: Add note with visibility "admin_only" to resident
  Action: GET /api/residents/[id] with staff-role token
  Expected: That note absent from response
  Pass/Fail: ___

TEST 4 — Admin-only note visible to admin
  Action: GET /api/residents/[id] with administrator token
  Expected: That note present in response
  Pass/Fail: ___

TEST 5 — Flagged note in Overview tab
  Setup: Add note with isFlagged = true to resident
  Action: Load Resident Story, Overview tab
  Expected: Red "Attention Needed" section visible at top with flagged note
  Pass/Fail: ___

TEST 6 — MDS recommendations endpoint
  Action: GET /api/residents/[id]/mds-recommendations for resident with
          2 completed assessments and 1 closed incident
  Expected: Response contains plain-text string mentioning specific MDS items
  Pass/Fail: ___

TEST 7 — Intervention created and appears in history
  Action: POST /api/residents/[id]/interventions {
    description: "Walker at bedside", department: "nursing",
    type: "permanent", startDate: today }
  Expected: Intervention saved with facilityId from auth, isActive = true
  Action: GET /api/residents/[id] → Overview tab loads
  Expected: Intervention visible in Intervention History panel
  Pass/Fail: ___

TEST 8 — Intervention deactivated
  Action: PATCH /api/residents/[id]/interventions/[iid] { isActive: false }
  Expected: removedAt set to now, isActive = false
  Action: Load Intervention History panel
  Expected: Intervention shown with strikethrough and "Removed" badge
  Pass/Fail: ___

TEST 9 — Add observation saves note
  Action: Open "Add Observation" dialog, type content, select visibility "team", submit
  Expected: Note saved, appears immediately in Notes & Observations tab
  Pass/Fail: ___

TEST 10 — Linked incidents appear on Incidents tab
  Setup: Set incident.residentId = resident.id on an existing incident
  Action: Load Incidents tab on Resident Story
  Expected: That incident appears in the timeline
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. I need to build the Resident Story —
a longitudinal profile connecting incidents, assessments, notes, interventions,
and attachments for each resident. The InterventionModel already exists
(created in task-02). This task builds its API routes and integrates it into
the Resident Story UI.

PART A — NEW MODELS

1. Create backend/src/models/resident.model.ts:
   id, facilityId, orgId (all required, facilityId indexed)
   firstName, lastName (required), preferredName (optional)
   roomNumber (required), wing (optional)
   admissionDate, dateOfBirth (optional Date)
   gender: "male"|"female"|"other"|"prefer_not_to_say" (optional)
   status: "active"|"discharged"|"on-leave" (default "active")
   primaryDiagnosis (optional), secondaryDiagnoses: string[] (default [])
   careLevel: "independent"|"assisted"|"memory_care"|"skilled_nursing" (required)
   primaryPhysician (optional)
   emergencyContact: { name, relationship, phone } (optional, _id: false)
   createdAt, updatedAt
   Compound index: { facilityId: 1, roomNumber: 1 }

2. Create backend/src/models/note.model.ts:
   id, facilityId (required, indexed)
   parentType: "incident"|"assessment"|"resident" (required)
   parentId (required, indexed)
   content (required, maxlength 2000)
   authorId, authorName, authorRole (required)
   visibility: "team"|"admin_only"|"sealed" (default "team")
   isFlagged: Boolean (default false)
   createdAt

3. Create backend/src/models/attachment.model.ts:
   id, facilityId (required, indexed)
   parentType: "incident"|"assessment"|"resident"
   parentId (indexed)
   fileUrl, fileName, fileType (required)
   fileSizeBytes: Number
   label: "witness_statement"|"resident_statement"|"scene_photo"|"medical_document"|"other"
   uploadedById, uploadedByName
   createdAt

4. Add optional residentId field to IncidentModel and AssessmentModel

PART B — API ROUTES (all require getCurrentUser() and facilityId enforcement)

GET  /api/residents?facilityId=X&search=Y
     List residents. Support name/room search. Return: id, roomNumber, firstName,
     lastName, careLevel, status, admissionDate.

POST /api/residents
     Create resident. facilityId from auth. Return created resident.

GET  /api/residents/[id]
     Full profile:
     - resident fields
     - linked incidents (by residentId) newest first
     - linked assessments (by residentId) newest first
     - notes: filter by visibility — admin_only notes stripped if !isAdminRole(user.role)
     - interventions: all from InterventionModel where residentId matches
     Return 403 if facilityId mismatch.

PATCH /api/residents/[id]
      Update resident fields. facilityId enforcement.

POST /api/residents/[id]/notes
     Add note. authorId, authorName, authorRole from auth.

POST /api/incidents/[id]/notes
     Add note to incident. Same pattern.

POST /api/incidents/[id]/attachments
     Save attachment metadata. fileUrl comes from client (Vercel Blob or S3 presigned URL).

GET /api/residents/[id]/mds-recommendations
    Call gpt-4o-mini with:
    "Based on these clinical assessments and incidents for [residentName] at a
    skilled nursing facility, what MDS Section items might qualify for enhanced
    Medicare reimbursement? Provide specific, actionable recommendations. Note:
    this is for an MDS coordinator to review — not a certified coding determination."
    Include last 2 assessments and last 3 incidents in the prompt context.
    Return: { recommendations: string, generatedAt: ISO timestamp }
    Cache in Redis: "waik:mds:{residentId}" with 24hr TTL.

POST /api/residents/[id]/interventions
     Create intervention in InterventionModel.
     Required: description, department, type, startDate.
     facilityId and residentId from URL + auth.
     residentRoom: look up from resident record.

PATCH /api/residents/[id]/interventions/[iid]
      Update isActive, notes. If isActive changes false→true: clear removedAt.
      If isActive changes true→false: set removedAt = now.

GET /api/residents/[id]/interventions
    All interventions for this resident + facilityId.
    Sort: isActive desc, placedAt desc (active first, then removed, newest first).

PART C — PAGES

app/admin/residents/page.tsx:
  Search input (name or room). Filter: All | Active | Discharged.
  Table: Room | Name | Care Level | # Incidents (30d) | Last Assessment | Next Due | View
  "Add Resident" → /admin/residents/new
  "Import Residents" → /admin/residents/import (task-17)

app/admin/residents/[id]/page.tsx — THE RESIDENT STORY:
Header: full name (preferred name in parens), room badge, care level badge,
        admission date, status badge (Active/Discharged/On Leave).

TAB 1 — OVERVIEW:
  If any notes have isFlagged = true: show red "Attention Needed" card at top
  with each flagged note's content and author.

  INTERVENTION HISTORY PANEL (always visible on this tab):
  Heading: "Care Plan Interventions" with count badge.
  List of all interventions for this resident from GET /api/residents/[id]/interventions.
  Each intervention card:
    - Description text (bold)
    - Department badge + type badge (Temporary/Permanent)
    - "Placed [date]" in muted text
    - If isActive: green "Active" badge
    - If !isActive: "Removed [date]" in strikethrough style, gray "Removed" badge
    - If triggeringIncidentId: link "See incident" → /admin/incidents/[id]
  "Add Intervention" button → opens inline form:
    Fields: description, department (dropdown), type (Temporary/Permanent), date, notes
    Submit → POST /api/residents/[id]/interventions
  Per-intervention: "Remove" button → confirmation dialog →
    PATCH /api/residents/[id]/interventions/[iid] { isActive: false }

  Recent incidents (last 3): compact cards with phase badge and completeness ring.
  Recent assessments (last 2 per type): with scores and next due dates.
  MDS Recommendations: lazy-loaded section. On first load: "Analyzing clinical
  data..." skeleton. Then display recommendations text.

TAB 2 — INCIDENTS:
  Full timeline, newest first.
  Each row: date | incident type | phase badge | completeness % | reporting nurse | View link

TAB 3 — ASSESSMENTS:
  Grouped by type (Activity, Dietary).
  Each row: date | score | conducted by | next due | View link

TAB 4 — NOTES & OBSERVATIONS:
  All notes from resident + linked incidents + linked assessments, newest first.
  Filter buttons: All | Admin Only | Flagged
  admin_only notes: only shown if isAdminRole(currentUser.role)
  "Add Observation" button → opens dialog:
    Textarea (max 2000 chars with counter), visibility selector, "Flag for admin" toggle
    Submit → POST /api/residents/[id]/notes

All routes must enforce facilityId from auth. Strip admin_only notes from
non-admin responses.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/16-RESIDENT-STORY.md`
- Document InterventionModel API routes in `documentation/waik/03-API-REFERENCE.md`
- Create `plan/pilot_1/phase_4/task-08-DONE.md`
