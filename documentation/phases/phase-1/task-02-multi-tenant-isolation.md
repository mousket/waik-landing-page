# Task: Multi-Tenant Data Isolation
## Phase: 1
## Depends On: task-01-clerk-auth
## Estimated Time: 3 hours

## Context Files
- lib/db.ts (update all queries)
- lib/types.ts (expand UserRole, add facilityId/orgId to Incident)
- backend/src/models/user.model.ts (update)
- lib/db-facility.ts (create)
- All API route handlers under app/api/

## Success Criteria
- [ ] getIncidents(facilityId) returns only that facility's incidents
- [ ] getIncidentById(id, facilityId) verifies ownership before returning
- [ ] Every API handler calls getCurrentUser() and passes facilityId to db queries
- [ ] facilityDb(facilityId) wrapper exists and is used in API routes
- [ ] IncidentModel has compound indexes on facilityId
- [ ] Cross-facility request returns 403 or empty data

## Test Cases
- GET /api/incidents with staff token for facility A → only facility A incidents
- GET /api/incidents/[id] with valid token for wrong facility → 403
- createIncidentFromReport includes facilityId and enforces it
- facilityDb(user.facilityId).getIncidents() returns scoped results

## Implementation Prompt

```
I'm building WAiK on Next.js 14 with ClerkJS auth now installed. I need to add proper multi-tenant data isolation to all API routes and database queries so no facility can see another facility's data.

CURRENT STATE:
- MongoDB models have facilityId and companyId fields but they're not enforced
- lib/db.ts getIncidents() returns ALL incidents regardless of facility
- API routes don't filter by facilityId

WHAT I NEED:

1. Update lib/db.ts — add facilityId to every query:
   - getIncidents(facilityId: string) — only returns incidents for that facility
   - getIncidentsByStaffId(staffId: string, facilityId: string) — filter by both
   - createIncidentFromReport(input) — must include facilityId
   - getIncidentById(id: string, facilityId: string) — verify ownership before returning
   - All other incident queries — add facilityId parameter and enforce it

2. Update ALL API route handlers:
   - Import getCurrentUser from lib/auth.ts
   - Call getCurrentUser() at the start of every handler
   - Return 401 if not authenticated
   - Pass facilityId to all db queries
   - Return 403 if incident/resource doesn't belong to user's facility

3. Update lib/types.ts:
   - Expand UserRole: "owner" | "administrator" | "director_of_nursing" | "head_nurse" | "rn" | "lpn" | "cna" | "staff" | "physical_therapist" | "dietician"
   - Add facilityId: string to Incident interface
   - Add orgId: string to Incident interface

4. Update backend/src/models/user.model.ts:
   - Add facilityId: string
   - Add orgId: string
   - Update role enum to match expanded UserRole
   - Add isWaikSuperAdmin: boolean (default false)

5. Add a facilityId compound index to IncidentModel:
   IncidentSchema.index({ facilityId: 1, createdAt: -1 })
   IncidentSchema.index({ facilityId: 1, phase: 1 })
   IncidentSchema.index({ facilityId: 1, staffId: 1 })

6. Create lib/db-facility.ts — a thin wrapper that pre-binds facilityId to all queries:
   export function facilityDb(facilityId: string) {
     return {
       getIncidents: () => getIncidents(facilityId),
       getIncidentById: (id) => getIncidentById(id, facilityId),
       // etc.
     }
   }
   This makes API routes cleaner: const db = facilityDb(user.facilityId)

DO NOT change any agent logic, voice capture, or UI components.
```
