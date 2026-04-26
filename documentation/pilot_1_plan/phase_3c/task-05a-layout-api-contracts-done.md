# Task 05a — Staff Layout, Tabs, Auth Guard + API Contracts
## Phase: 3c — Staff Dashboard
## Estimated Time: 2–3 hours
## Depends On: task-00e (middleware), task-02 (data isolation), Phase 0.6 shells

---

## Why This Task Exists

Every staff dashboard subtask needs two things to be stable before it can
be written: a layout that enforces role-gating at the component level, and
API routes that return the exact fields those subtasks need.

**The layout problem:** The Phase 0.6 shell has the tab bar structure but
does not enforce the staff-only guard at the layout level — it relies
entirely on middleware. This task adds the server-side layout guard so that
even if middleware is bypassed (impossible in production, but good practice
for defense-in-depth), the layout refuses to render for non-staff users.

**The API contract problem:** `GET /api/staff/incidents` exists but its
exact response shape — specifically which fields it returns and whether
`questionsAnswered`, `tier2QuestionsGenerated`, and `completenessScore`
are included — is unverified. The pending questions section needs those
fields to compute the question count badge. This task verifies and extends
the response shape.

**Design pattern: Single badge-counts endpoint.**
Tab badges (pending question count on Home and Incidents tabs, assessment
count on Assessments tab) could each be computed inside their respective
sections. But that creates multiple API calls from the layout on every
page navigation. The better pattern: one lightweight `GET /api/staff/badge-counts`
endpoint that returns `{ pendingQuestions: N, dueAssessments: N }` and is
polled every 60 seconds from the layout. One endpoint, one poll, shared
across all tabs.

**Infrastructure: Why 60 seconds and not shorter?**
A nurse's pending question count does not change second-to-second. The AI
gap analysis runs when she completes Tier 1 — that takes 5-10 seconds.
After that, questions exist until she answers them. 60-second polling
provides timely updates without hammering the server. On a facility with
10 nurses all polling every 60 seconds, that is 10 requests per minute —
negligible load.

---

## Context Files

- `app/staff/layout.tsx` — update from Phase 0.6 shell
- `app/staff/dashboard/page.tsx` — verified it exists
- `app/api/staff/incidents/route.ts` — extend response shape
- `app/api/staff/badge-counts/route.ts` — CREATE THIS
- `lib/auth.ts` — getCurrentUser()
- `lib/permissions.ts` — withAuth()
- `backend/src/models/incident.model.ts` — verify staffId, questionsAnswered fields

---

## Staff Incidents API Contract (locked after this task)

`GET /api/staff/incidents?unit=Wing+A`

Required fields in response per incident:
```typescript
interface StaffIncidentSummary {
  id: string
  facilityId: string
  residentRoom: string          // room number only — no PHI
  incidentType: string
  hasInjury: boolean
  phase: "phase_1_in_progress" | "phase_1_complete" | "phase_2_in_progress" | "closed"
  staffId: string               // must equal currentUser.userId for "my incidents"
  startedAt: string             // ISO — phaseTransitionTimestamps.phase1Started
  phase1SignedAt: string | null
  completenessScore: number     // live score 0-100
  completenessAtSignoff: number // locked at sign-off, 0 if not yet signed
  tier2QuestionsGenerated: number
  questionsAnswered: number
  questionsDeferred: number
}
```

Query parameters:
  `?unit=Wing+A` — optional, filter by selected unit (matched against residentRoom prefix or wing field if available)

Response shape:
  `{ incidents: StaffIncidentSummary[], total: number }`

The route must filter by:
  `staffId: currentUser.userId` AND `facilityId: currentUser.facilityId`

Never return incidents belonging to other staff members.

---

## Badge Counts API Contract

`GET /api/staff/badge-counts`

```typescript
interface BadgeCounts {
  pendingQuestions: number   // incidents where staffId=me, phase_1_in_progress, completenessScore < 100
  dueAssessments: number     // assessments where nextDueAt is within 7 days
}
```

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] app/staff/layout.tsx redirects admin-tier users to /admin/dashboard
- [ ] app/staff/layout.tsx redirects super admins to /waik-admin
- [ ] Staff role (rn, cna, lpn, etc.) accesses /staff/* without redirect
- [ ] GET /api/staff/incidents returns StaffIncidentSummary shape for each incident
- [ ] GET /api/staff/incidents only returns incidents where staffId = currentUser.userId
- [ ] GET /api/staff/incidents?unit=Wing+A filters by unit (or returns all if unit param absent)
- [ ] GET /api/staff/badge-counts returns { pendingQuestions, dueAssessments }
- [ ] GET /api/staff/badge-counts only counts current user's pending questions
- [ ] Both routes return 401 without auth
- [ ] lib/types/staff-incident-summary.ts created with StaffIncidentSummary type
- [ ] Bottom tab bar renders with unit label in header when unit is selected
- [ ] Badge polling wired in layout — updates every 60 seconds

---

## Test Cases

```
TEST 1 — Admin redirected from staff layout
  Action: Sign in as director_of_nursing, navigate to /staff/dashboard
  Expected: Redirected to /admin/dashboard
  Pass/Fail: ___

TEST 2 — Staff accesses layout correctly
  Action: Sign in as roleSlug: "rn"
  Expected: /staff/dashboard loads. Bottom tab bar visible.
  Pass/Fail: ___

TEST 3 — GET /api/staff/incidents returns only current user's incidents
  Action: Sign in as m.torres@sunrisemn.com
          GET /api/staff/incidents
  Expected: Only incidents where staffId = "user-rn-001" returned
            INC-003, INC-004, INC-006, INC-007, INC-009 (Maria's reports)
            NOT INC-001 (Linda's), NOT INC-002 (DeShawn's)
  Pass/Fail: ___

TEST 4 — StaffIncidentSummary shape correct
  Action: GET /api/staff/incidents, inspect one incident object
  Expected: Contains id, residentRoom, incidentType, phase, staffId,
            startedAt, completenessScore, tier2QuestionsGenerated, questionsAnswered
            Does NOT contain residentName or any resident PHI
  Pass/Fail: ___

TEST 5 — questionsAnswered reflects actual state
  Action: GET /api/staff/incidents, find INC-003 (88% complete, 5 answered of 6)
  Expected: questionsAnswered: 5, tier2QuestionsGenerated: 6
  Pass/Fail: ___

TEST 6 — Badge counts correct for Maria
  Action: Sign in as m.torres@sunrisemn.com
          GET /api/staff/badge-counts
  Expected: { pendingQuestions: 1, dueAssessments: 1 }
            (INC-003 is in_progress with questions, ASSESS-003 is due tomorrow)
  Pass/Fail: ___

TEST 7 — Badge counts for other user are different
  Action: Sign in as l.osei@sunrisemn.com (Linda — CNA)
          GET /api/staff/badge-counts
  Expected: { pendingQuestions: 1, dueAssessments: 0 }
            (INC-001 is Linda's, no assessments assigned to her)
  Pass/Fail: ___

TEST 8 — Badge polling wired in layout
  Action: Load any /staff/* page, open Network tab in DevTools
          Wait 65 seconds
  Expected: GET /api/staff/badge-counts called again after ~60 seconds
  Pass/Fail: ___

TEST 9 — Unit filter works
  Action: GET /api/staff/incidents?unit=Wing+A (or equivalent)
  Expected: Filtered results (or all if no unit matching logic yet)
            Note actual behavior in DONE file
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task locks the staff layout auth
guard and creates the API contracts the dashboard subtasks depend on.

PART A — UPDATE app/staff/layout.tsx

Server component guard:
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect("/sign-in")
  if (currentUser.isWaikSuperAdmin) redirect("/waik-admin")
  if (currentUser.isAdminTier) redirect("/admin/dashboard")
  // Staff roles pass through

Keep all existing bottom tab bar and top header from Phase 0.6 shell.
Update top header: show "Wing A" or selected unit name next to avatar
if the user has a selectedUnit in their UserModel record.

Unit badge in header:
  If currentUser.selectedUnit exists AND selectedUnitDate === today:
    Show small teal pill next to avatar: "[unit name]"
  Else: show nothing (unit selection modal handles this in task-00e)

PART B — EXTEND GET /api/staff/incidents/route.ts

The route already filters by facilityId (task-02). Extend it:

1. Add staffId filter — CRITICAL:
   Query must include: { staffId: currentUser.userId }
   This ensures staff only see their own incidents.

2. Verify and add missing response fields.
   The Mongoose query projection must include:
   id, facilityId, residentRoom, incidentType, hasInjury, phase,
   staffId, startedAt (from phaseTransitionTimestamps.phase1Started),
   phase1SignedAt (from phaseTransitionTimestamps.phase1Signed),
   completenessScore, completenessAtSignoff,
   tier2QuestionsGenerated, questionsAnswered, questionsDeferred

   Map phaseTransitionTimestamps in the response:
   startedAt: incident.phaseTransitionTimestamps?.phase1Started ?? incident.createdAt
   phase1SignedAt: incident.phaseTransitionTimestamps?.phase1Signed ?? null

3. Add optional ?unit query param:
   If unit param present: filter where incident.wing matches unit
   (wing field is on ResidentModel but may not be on IncidentModel directly)
   For now: if IncidentModel has no wing field, add a comment:
   // TODO: filter by unit when wing is stored on incident
   and return all incidents without unit filtering

4. NEVER include: residentName, residentFirstName, residentLastName

5. Response: { incidents: StaffIncidentSummary[], total: number }

PART C — CREATE lib/types/staff-incident-summary.ts

export interface StaffIncidentSummary {
  id: string
  facilityId: string
  residentRoom: string
  incidentType: string
  hasInjury: boolean
  phase: "phase_1_in_progress" | "phase_1_complete" | "phase_2_in_progress" | "closed"
  staffId: string
  startedAt: string
  phase1SignedAt: string | null
  completenessScore: number
  completenessAtSignoff: number
  tier2QuestionsGenerated: number
  questionsAnswered: number
  questionsDeferred: number
}

PART D — CREATE GET /api/staff/badge-counts/route.ts

export const GET = withAuth(async (req, { currentUser }) => {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  const [pendingCount, assessmentCount] = await Promise.all([
    // Pending questions: staff's in-progress incidents with incomplete questions
    IncidentModel.countDocuments({
      facilityId: currentUser.facilityId,
      staffId: currentUser.userId,
      phase: "phase_1_in_progress",
      completenessScore: { $lt: 100 }
    }),
    // Due assessments: any assessment due within 7 days
    // (if AssessmentModel doesn't exist yet: return 0 with a console.warn)
    AssessmentModel
      ? AssessmentModel.countDocuments({
          facilityId: currentUser.facilityId,
          nextDueAt: { $gte: now, $lte: sevenDaysFromNow }
        })
      : Promise.resolve(0)
  ])
  
  return Response.json({
    pendingQuestions: pendingCount,
    dueAssessments: assessmentCount
  })
})

Handle AssessmentModel not existing gracefully:
  try {
    const assessmentModule = require("@/backend/src/models/assessment.model")
    AssessmentModel = assessmentModule.AssessmentModel
  } catch {
    console.warn("[badge-counts] AssessmentModel not found — returning 0")
    AssessmentModel = null
  }

PART E — WIRE BADGE POLLING IN LAYOUT

In app/staff/layout.tsx, add a client component for badge polling.

Create components/staff/badge-poller.tsx ("use client"):
  Props: (none — fetches its own data)
  
  Uses a global context to share badge counts across all staff pages.
  
  Create context/badge-context.tsx:
    interface BadgeContextValue {
      pendingQuestions: number
      dueAssessments: number
      refresh: () => void
    }
    export const BadgeContext = createContext<BadgeContextValue>(...)
    
  In BadgePoller:
    const { setBadges } = useBadgeContext()
    
    useEffect(() => {
      async function fetchBadges() {
        const res = await fetch("/api/staff/badge-counts")
        if (res.ok) {
          const data = await res.json()
          setBadges(data)
        }
      }
      
      fetchBadges()  // immediate on mount
      const interval = setInterval(fetchBadges, 60_000)  // then every 60s
      return () => clearInterval(interval)
    }, [])
  
  Return null — this component has no UI

In app/staff/layout.tsx:
  Wrap content in <BadgeProvider>
  Place <BadgePoller /> at the top (renders nothing, just polls)
  
  In the tab bar: use useBadgeContext() to get counts for badges:
    Home tab badge: badges.pendingQuestions (hidden if 0)
    Incidents tab badge: badges.pendingQuestions (same count)
    Assessments tab badge: badges.dueAssessments (hidden if 0)

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/10-STAFF-DASHBOARD.md` — API contracts section
- Create `plan/pilot_1/phase_3c/task-05a-DONE.md`

