# Task 06a — Admin Layout, Navigation, Auth Guard + Incident API Extension
## Phase: 3b — Admin Dashboard
## Estimated Time: 2–3 hours
## Depends On: task-02 (data isolation), task-00e (middleware), Phase 0.6 shells

---

## Why This Task Exists

Every subsequent admin dashboard task needs two things before it can be
written: a layout that enforces role-based access, and an incident API
that returns the fields those tasks actually need.

**The layout problem:** The shell from Phase 0.6 has a top nav and a
content area. But it does not enforce canAccessPhase2() at the route
level — it only checks isAdminTier. The admin dashboard specifically
needs `canAccessPhase2()` for the Claim and Phase transition actions.
This task locks that down.

**The API problem:** The existing `GET /api/incidents` returns incidents
but the exact response shape — specifically `phaseTransitionTimestamps`,
`hasInjury`, `idtTeam`, and the `days` filter — is unconfirmed. The
dashboard tasks that follow need a stable contract. This task defines and
tests that contract so 06b–06f can depend on it without discovery.

**Design pattern: API contract before UI.** A common mistake is building
UI against assumed API shapes and then retrofitting when the real data
arrives. This task inverts that — API shape is verified and locked first,
then UI tasks build against the contract. This is how production teams
work.

---

## Infrastructure Context

**Why the layout guard matters for security:**
Next.js middleware (task-00e) catches unauthenticated requests and
non-admin-tier users. But middleware runs before routing — it does not
know which specific admin action is being requested. A head nurse is
isAdminTier but cannot claim a Phase 2 investigation. That permission
(canAccessPhase2) must be checked at the route or layout level, not just
middleware.

Two-layer protection:
  Layer 1 — middleware.ts: blocks non-admin-tier users from /admin/*
  Layer 2 — layout.tsx server component: checks specific permissions
  Layer 3 — API routes: checks both isAdminTier AND facilityId on every request

All three layers are necessary. Removing any one creates a gap.

---

## Context Files

- `app/admin/layout.tsx` — update from Phase 0.6 shell
- `app/api/incidents/route.ts` — extend GET handler
- `lib/auth.ts` — getCurrentUser(), canAccessPhase2(), requireFacility()
- `lib/permissions.ts` — withAdminAuth() wrapper
- `backend/src/models/incident.model.ts` — verify field names

---

## API Contract (locked after this task — 06b through 06f depend on this)

`GET /api/incidents?facilityId=X&phase=Y&days=30`

Response shape per incident (minimum fields required):
```typescript
{
  id: string
  facilityId: string
  residentRoom: string           // room number only — NO residentName
  incidentType: string           // "fall" | "medication_error" | etc.
  hasInjury: boolean
  phase: string                  // phase_1_in_progress | phase_1_complete | phase_2_in_progress | closed
  staffId: string                // reporting staff member
  reportedByName: string         // display name of reporter
  reportedByRole: string
  startedAt: string              // ISO — phaseTransitionTimestamps.phase1Started
  phase1SignedAt: string | null   // ISO — phaseTransitionTimestamps.phase1Signed
  phase2ClaimedAt: string | null  // ISO — phaseTransitionTimestamps.phase2Claimed
  phase2LockedAt: string | null   // ISO — phaseTransitionTimestamps.phase2Locked
  completenessAtSignoff: number   // 0–100
  completenessScore: number       // current live score
  investigatorId: string | null
  investigatorName: string | null
  idtTeam: Array<{
    userId: string
    name: string
    role: string
    status: "pending" | "answered"
    questionSent: string | null
    questionSentAt: string | null
    response: string | null
    respondedAt: string | null
  }>
  phase2Sections: {
    contributingFactors: { status: string }
    rootCause: { status: string }
    interventionReview: { status: string }
    newIntervention: { status: string }
  }
}
```

Query parameters:
  `?phase=phase_1_in_progress` — filter to single phase
  `?phase=phase_1_complete,phase_2_in_progress` — comma-separated multi-phase
  `?days=30` — only incidents where startedAt >= 30 days ago
  `?hasInjury=true` — only injury-flagged incidents

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] app/admin/layout.tsx guards /admin/* with isAdminTier check
- [ ] Staff role (rn, cna, lpn etc.) navigating to /admin/* is redirected to /staff/dashboard
- [ ] Super admin can access /admin/* (isWaikSuperAdmin bypasses isAdminTier)
- [ ] GET /api/incidents returns all fields in the API contract above
- [ ] GET /api/incidents?phase=phase_1_complete returns only phase_1_complete incidents
- [ ] GET /api/incidents?days=30 returns only incidents from last 30 days
- [ ] GET /api/incidents?hasInjury=true returns only injury-flagged incidents
- [ ] Response never includes residentName or residentFirstName or residentLastName
- [ ] Response always includes residentRoom
- [ ] 401 returned for unauthenticated requests
- [ ] 403 returned for requests where facilityId does not match user's facility
- [ ] Admin layout top nav renders all 6 links
- [ ] Active nav link highlighted correctly per current route

---

## Test Cases

```
TEST 1 — Staff role redirected from admin layout
  Action: Sign in as roleSlug: "rn", navigate to /admin/dashboard
  Expected: Redirected to /staff/dashboard
  Pass/Fail: ___

TEST 2 — Admin tier accesses layout
  Action: Sign in as roleSlug: "director_of_nursing"
  Expected: /admin/dashboard loads, top nav visible
  Pass/Fail: ___

TEST 3 — GET /api/incidents returns contract shape
  Action: GET /api/incidents?facilityId=fac-sunrise-mpls-001
  Expected: Array of incident objects each containing all required fields
            residentRoom present, NO residentName field in any object
  Pass/Fail: ___

TEST 4 — Phase filter works
  Action: GET /api/incidents?phase=phase_1_complete
  Expected: Only phase_1_complete incidents returned
  Pass/Fail: ___

TEST 5 — Multi-phase filter works
  Action: GET /api/incidents?phase=phase_1_complete,phase_2_in_progress
  Expected: Both phases returned, no others
  Pass/Fail: ___

TEST 6 — Days filter works
  Action: GET /api/incidents?days=7
  Expected: Only incidents where startedAt >= 7 days ago
  Pass/Fail: ___

TEST 7 — hasInjury filter works
  Action: GET /api/incidents?hasInjury=true
  Expected: Only incidents with hasInjury: true
  Pass/Fail: ___

TEST 8 — Cross-facility isolation
  Action: GET /api/incidents?facilityId=fac-OTHER (different facility)
          with token for fac-sunrise-mpls-001
  Expected: 403 Forbidden
  Pass/Fail: ___

TEST 9 — idtTeam shape correct
  Action: GET incident where idtTeam has at least one answered member
  Expected: idtTeam array contains objects with questionSent, respondedAt,
            status: "answered", response text
  Pass/Fail: ___

TEST 10 — phase1SignedAt mapped correctly
  Action: GET phase_1_complete incident
  Expected: phase1SignedAt is a valid ISO string (not null)
            startedAt is earlier than phase1SignedAt
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task locks the admin layout auth
guard and extends the incident API to the contract that all admin
dashboard tasks depend on.

PART A — UPDATE app/admin/layout.tsx

This is a server component. It must:

1. Call getCurrentUser() from lib/auth.ts
2. If no user: redirect("/sign-in")
3. If user is not isAdminTier AND not isWaikSuperAdmin: redirect("/staff/dashboard")
4. Pass user name/role to client components via props or server context

The top navigation bar (already built in Phase 0.6 shell) should remain.
Verify it shows all 6 links: Dashboard | Incidents | Assessments |
Residents | Intelligence | Settings

If the nav uses usePathname() for active state highlighting: wrap that
part in a "use client" component (ClientNav) and pass the links as props.
The layout itself stays a server component.

PART B — EXTEND GET /api/incidents/route.ts

The existing route filters by facilityId (task-02). Extend it to:

1. Support query params:
   ?phase=X          — exact phase match
   ?phase=X,Y,Z      — comma-separated multi-phase (split and use $in)
   ?days=N           — filter startedAt >= N days ago
   ?hasInjury=true   — filter hasInjury === true

2. Ensure response includes these fields from IncidentModel:
   id, facilityId, residentRoom, incidentType, hasInjury, phase,
   staffId, reportedByName, reportedByRole,
   phaseTransitionTimestamps (as flattened fields):
     startedAt: phaseTransitionTimestamps.phase1Started
     phase1SignedAt: phaseTransitionTimestamps.phase1Signed
     phase2ClaimedAt: phaseTransitionTimestamps.phase2Claimed
     phase2LockedAt: phaseTransitionTimestamps.phase2Locked
   completenessAtSignoff, completenessScore,
   investigatorId, investigatorName,
   idtTeam (full array with all fields from model),
   phase2Sections (status of all 4 sections)

3. NEVER include: residentName, residentFirstName, residentLastName,
   resident date of birth, or any other resident PHI.
   residentRoom is permitted (room number only).

4. Response format:
   { incidents: IncidentSummary[], total: number }
   
   Type IncidentSummary matches the contract in task-06a spec exactly.

5. Authorization:
   - Use withAdminAuth() wrapper from lib/api-handler.ts
   - Enforce facilityId from currentUser (not from query param)
   - Super admin may pass any facilityId — check isWaikSuperAdmin

PART C — CREATE lib/types/incident-summary.ts

Export the IncidentSummary type matching the API contract.
Import this type in both the route handler and the dashboard pages.
Having a shared type prevents drift between API and UI.

interface IncidentSummary {
  id: string
  facilityId: string
  residentRoom: string
  incidentType: "fall" | "medication_error" | "resident_conflict" |
                "wound_injury" | "abuse_neglect" | string
  hasInjury: boolean
  phase: "phase_1_in_progress" | "phase_1_complete" |
         "phase_2_in_progress" | "closed"
  staffId: string
  reportedByName: string
  reportedByRole: string
  startedAt: string
  phase1SignedAt: string | null
  phase2ClaimedAt: string | null
  phase2LockedAt: string | null
  completenessAtSignoff: number
  completenessScore: number
  investigatorId: string | null
  investigatorName: string | null
  idtTeam: IdtTeamMember[]
  phase2Sections: {
    contributingFactors: { status: "not_started" | "in_progress" | "complete" }
    rootCause: { status: "not_started" | "in_progress" | "complete" }
    interventionReview: { status: "not_started" | "in_progress" | "complete" }
    newIntervention: { status: "not_started" | "in_progress" | "complete" }
  }
}

interface IdtTeamMember {
  userId: string
  name: string
  role: string
  status: "pending" | "answered"
  questionSent: string | null
  questionSentAt: string | null
  response: string | null
  respondedAt: string | null
}

Run npm run build. Fix all TypeScript errors.
Do not build any dashboard UI yet — that is 06b onward.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/11-ADMIN-DASHBOARD.md` — API contract section
- Create `plan/pilot_1/phase_3b/task-06a-DONE.md`
