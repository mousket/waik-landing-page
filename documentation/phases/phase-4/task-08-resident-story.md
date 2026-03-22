# Task: Resident Story (Longitudinal Profile)
## Phase: 4
## Depends On: task-07-assessment-system
## Estimated Time: 8 hours

## Context Files
- backend/src/models/resident.model.ts (create)
- backend/src/models/note.model.ts (create)
- backend/src/models/attachment.model.ts (create)
- app/admin/residents/page.tsx (create)
- app/admin/residents/[id]/page.tsx (create)
- app/api/residents/* (create)
- app/api/incidents/[id]/notes (create)
- app/api/incidents/[id]/attachments (create)

## Success Criteria
- [ ] Resident, Note, Attachment models created; residentId on Incident/Assessment
- [ ] GET/POST/PATCH residents; GET residents/[id] with linked incidents/assessments/notes
- [ ] POST residents/[id]/notes; POST incidents/[id]/notes and attachments
- [ ] Admin residents list: search, filter; "View Story"
- [ ] Resident Story page: Overview, Incidents, Assessments, Notes & Observations tabs; MDS recommendations

## Test Cases
- GET /api/residents?facilityId=X returns only facility residents
- Resident Story loads incidents, assessments, notes for that resident
- MDS recommendations endpoint returns suggestions from assessment/incident data

## Implementation Prompt

```
I'm building WAiK on Next.js 14. I need to add the Resident Story — a longitudinal profile connecting incidents, assessments, notes, and attachments for each resident.

WHAT I NEED:

1. Create backend/src/models/resident.model.ts:
   id, facilityId, orgId
   firstName, lastName, preferredName
   roomNumber, wing (optional)
   admissionDate, dateOfBirth, gender
   status: "active" | "discharged" | "on-leave"
   primaryDiagnosis, secondaryDiagnoses: string[]
   careLevel: "independent" | "assisted" | "memory_care" | "skilled_nursing"
   primaryPhysician (string)
   emergencyContact: { name, relationship, phone }
   createdAt, updatedAt

2. Create backend/src/models/note.model.ts:
   id, facilityId
   parentType: "incident" | "assessment" | "resident"
   parentId (string)
   content (string — free-form observation, max 2000 chars)
   authorId, authorName, authorRole
   visibility: "team" | "admin_only" | "sealed"
   isFlagged: boolean (true = needs admin attention)
   createdAt

3. Create backend/src/models/attachment.model.ts:
   id, facilityId
   parentType: "incident" | "assessment" | "resident"
   parentId
   fileUrl, fileName, fileType, fileSizeBytes
   label: "witness_statement" | "resident_statement" | "scene_photo" | "medical_document" | "other"
   uploadedById, uploadedByName
   createdAt

4. Add optional residentId field to IncidentModel and AssessmentModel

5. Create API routes:
   - GET /api/residents?facilityId=X — list with search
   - POST /api/residents — create resident
   - GET /api/residents/[id] — full profile with linked incidents, assessments, notes
   - PATCH /api/residents/[id] — update resident info
   - POST /api/residents/[id]/notes — add note
   - POST /api/incidents/[id]/notes — add note to incident
   - POST /api/incidents/[id]/attachments — add attachment (stores URL, not the file — use Vercel Blob or presigned S3 for actual upload)
   - GET /api/residents/[id]/mds-recommendations — returns MDS coding suggestions based on documented assessments and incidents

6. Create app/admin/residents/page.tsx:
   Search + filter resident list (name, room, care level, status)
   Each row: name, room, care level, # incidents (30 days), last assessment date, next assessment due
   "View Story" button

7. Create app/admin/residents/[id]/page.tsx — The Resident Story:
   Header: name, room, care level, admission date, primary diagnosis
   Status badge: Active / Discharged / On Leave
   
   Four tabs:
   TAB 1 — Overview
     Recent incidents (last 3, with phase status)
     Recent assessments (last 2, with scores)
     Upcoming assessments (next due)
     Any flagged notes (isFlagged = true) shown prominently
   
   TAB 2 — Incidents
     Full timeline, newest first
     Each: date, type, phase, completeness score, reporting nurse, "View" link
   
   TAB 3 — Assessments
     All assessments grouped by type
     Each: date, type, score, conducted by, next due, "View" link
   
   TAB 4 — Notes & Observations
     All notes from any parent (incident, assessment, resident-level)
     Filter by: All | Admin Only | Flagged
     "Add Observation" button — opens a textarea modal
     Character count, visibility selector, "Flag for admin" toggle

8. Add MDS Recommendations section to the Resident Story overview tab:
   Based on documented assessments and incidents, show:
   "Based on documented clinical data, the following MDS items may qualify for enhanced reimbursement:
    - [Specific recommendation with dollar estimate if applicable]"
   This is a simple LLM call against the resident's assessment history — not a certified coding tool, just a flag for the MDS coordinator to review.
```
