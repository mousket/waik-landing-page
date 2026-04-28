# Task IR-1a — POST /api/report/start + Tier 1 Config + ReportSession Type
## Phase: IR-1 — Incident Reporting Frontend + Backend Wiring
## Estimated Time: 2–3 hours
## Depends On: Phase 0-0.7 complete (Clerk auth, MongoDB, Redis)

---

## Why This Task Exists

This is the foundation of the incident reporting rebuild. It creates the
entry point for every incident report — the route the frontend calls when
the nurse taps "Start Report" from the resident splash screen. It also
creates the Tier 1 question configuration and the unified ReportSession
type that every subsequent task builds on.

Nothing else in Phase IR-1 can be built until this task is complete.

---

## What This Task Creates

1. `lib/config/tier1-questions.ts` — Tier 1 + closing question definitions
2. `lib/config/report-session.ts` — ReportSession interface + Redis CRUD helpers
3. `app/api/report/start/route.ts` — POST route

---

## Context Files

- `backend/src/models/incident.model.ts` — IncidentModel for creating the incident
- `lib/agents/expert_investigator/session_store.ts` — reference for Redis pattern
- `lib/auth.ts` — getCurrentUser() for auth
- `lib/db.ts` — createIncidentFromReport or direct IncidentModel.create
- `lib/gold_standards.ts` — AgentState type reference

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] POST /api/report/start with valid auth creates an incident in MongoDB
- [ ] POST /api/report/start returns sessionId + 5 Tier 1 questions
- [ ] POST /api/report/start without auth returns 401
- [ ] POST /api/report/start without facilityId returns 400
- [ ] POST /api/report/start with missing required fields returns 400
- [ ] ReportSession is created in Redis at waik:report:{sessionId}
- [ ] ReportSession TTL is 7200 seconds (2 hours)
- [ ] Incident created in MongoDB has phase: "phase_1_in_progress"
- [ ] Incident has hasInjury flag set correctly
- [ ] Incident has redFlags.hasInjury set if injury reported
- [ ] lib/config/tier1-questions.ts exports FALL_TIER1_QUESTIONS (5 questions)
- [ ] lib/config/tier1-questions.ts exports CLOSING_QUESTIONS (3 questions)

---

## Test Cases

```
TEST 1 — Happy path: fall incident start
  Action: POST /api/report/start with valid auth token
  Body: {
    incidentType: "fall",
    residentId: "res-001",
    residentName: "Margaret Chen",
    residentRoom: "102",
    location: "Room 102 — beside bed",
    incidentDate: "2026-04-28",
    incidentTime: "06:15",
    hasInjury: null,
    witnessesPresent: false
  }
  Expected: 200 with {
    sessionId: string (UUID),
    incidentId: string (UUID),
    tier1Questions: array of 5 questions,
    completenessScore: 0,
    phase: "tier1"
  }
  Verify: IncidentModel.findOne({ id: incidentId }) returns a document
  Verify: Redis GET waik:report:{sessionId} returns valid JSON
  Pass/Fail: ___

TEST 2 — Missing auth
  Action: POST /api/report/start without Clerk session
  Expected: 401
  Pass/Fail: ___

TEST 3 — Missing facilityId
  Action: POST with valid auth but user has no facilityId
  Expected: 400 { error: "Facility ID required" }
  Pass/Fail: ___

TEST 4 — Missing required fields
  Action: POST with valid auth but missing residentName
  Expected: 400 { error: "residentName is required" }
  Pass/Fail: ___

TEST 5 — Injury flag triggers red alert
  Action: POST with hasInjury: true
  Expected: Incident created with:
    redFlags.hasInjury = true
    redFlags.stateReportDueAt = incidentDate + 2 hours
    priority = "urgent"
  Pass/Fail: ___

TEST 6 — Tier 1 questions match spec
  Action: Inspect response.tier1Questions
  Expected: 5 questions with ids t1-q1 through t1-q5
    All have tier: "tier1", allowDefer: false, required: true
    Each has text, label, areaHint
  Pass/Fail: ___

TEST 7 — Redis session structure
  Action: Redis GET waik:report:{sessionId}
  Expected: JSON with all ReportSession fields populated:
    reportPhase: "tier1"
    tier1Questions: 5 items
    tier1Answers: {}
    fullNarrative: ""
    completenessScore: 0
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am rebuilding WAiK's incident reporting system from scratch.
This task creates the foundation: the /api/report/start route,
the Tier 1 question config, and the ReportSession Redis session type.

REFERENCE: The architectural blueprint is at
plan/pilot_1/blueprint/WAiK_Incident_Reporting_Blueprint.md
Read Sections 1, 2, and 4 of that document before building anything.

═══════════════════════════════════════════════════════════
PART A — CREATE lib/config/tier1-questions.ts
═══════════════════════════════════════════════════════════

Create a new file with these exact exports:

interface Tier1Question {
  id: string
  text: string
  label: string
  areaHint: string
  tier: "tier1" | "closing"
  allowDefer: boolean
  required: boolean
}

const FALL_TIER1_QUESTIONS: Tier1Question[] = [
  {
    id: "t1-q1",
    text: "Tell us everything that happened — describe the fall in as much detail as you have.",
    label: "Q1",
    areaHint: "Narrative",
    tier: "tier1",
    allowDefer: false,
    required: true
  },
  {
    id: "t1-q2",
    text: "What did the resident say happened?",
    label: "Q2",
    areaHint: "Resident Statement",
    tier: "tier1",
    allowDefer: false,
    required: true
  },
  {
    id: "t1-q3",
    text: "What were your intervention steps — what did you do to help?",
    label: "Q3",
    areaHint: "Interventions",
    tier: "tier1",
    allowDefer: false,
    required: true
  },
  {
    id: "t1-q4",
    text: "Tell us about the environment — the room, lighting, floor conditions, and any equipment nearby.",
    label: "Q4",
    areaHint: "Environment",
    tier: "tier1",
    allowDefer: false,
    required: true
  },
  {
    id: "t1-q5",
    text: "Why do you think the incident occurred, and how could it have been prevented?",
    label: "Q5",
    areaHint: "Root Cause",
    tier: "tier1",
    allowDefer: false,
    required: true
  }
]

const CLOSING_QUESTIONS: Tier1Question[] = [
  {
    id: "c-q1",
    text: "What immediate interventions did you put in place for this resident?",
    label: "Closing 1",
    areaHint: "Interventions",
    tier: "closing",
    allowDefer: false,
    required: true
  },
  {
    id: "c-q2",
    text: "What do you think are the contributing factors or root cause?",
    label: "Closing 2",
    areaHint: "Root Cause",
    tier: "closing",
    allowDefer: false,
    required: true
  },
  {
    id: "c-q3",
    text: "What do you recommend should be done to prevent this from happening again?",
    label: "Closing 3",
    areaHint: "Recommendations",
    tier: "closing",
    allowDefer: false,
    required: true
  }
]

const TIER1_BY_TYPE: Record<string, Tier1Question[]> = {
  fall: FALL_TIER1_QUESTIONS,
}

Export all four: FALL_TIER1_QUESTIONS, CLOSING_QUESTIONS, TIER1_BY_TYPE,
and the Tier1Question type.

═══════════════════════════════════════════════════════════
PART B — CREATE lib/config/report-session.ts
═══════════════════════════════════════════════════════════

Create the ReportSession interface and Redis CRUD helpers.

import { getRedisClient } from wherever the existing Redis client is
(check lib/agents/expert_investigator/session_store.ts for the pattern).

const REPORT_SESSION_PREFIX = "waik:report:"
const REPORT_SESSION_TTL = 7200  // 2 hours

interface ReportSession {
  sessionId: string
  incidentId: string
  facilityId: string
  userId: string
  userName: string
  userRole: string
  
  incidentType: string
  residentId: string
  residentName: string
  residentRoom: string
  location: string
  hasInjury: boolean | null
  
  reportPhase: "tier1" | "gap_analysis" | "tier2" | "closing" | "signoff"
  
  tier1Questions: any[]
  tier1Answers: Record<string, string>
  tier1CompletedAt: string | null
  
  fullNarrative: string
  
  agentState: any | null
  
  tier2Questions: any[]
  tier2Answers: Record<string, string>
  tier2DeferredIds: string[]
  tier2UnknownIds: string[]
  
  closingQuestions: any[]
  closingAnswers: Record<string, string>
  
  activeDataCollectionMs: number
  dataPointsPerQuestion: Array<{
    questionId: string
    questionText: string
    dataPointsCovered: number
    fieldsCovered: string[]
  }>
  
  completenessScore: number
  completenessAtTier1: number
  
  startedAt: string
  lastActivityAt: string
}

Export these functions:

async function createReportSession(session: ReportSession): Promise<void>
  - const redis = getRedisClient()
  - await redis.set(
      REPORT_SESSION_PREFIX + session.sessionId,
      JSON.stringify(session),
      "EX", REPORT_SESSION_TTL
    )

async function getReportSession(sessionId: string): Promise<ReportSession | null>
  - const redis = getRedisClient()
  - const raw = await redis.get(REPORT_SESSION_PREFIX + sessionId)
  - if (!raw) return null
  - return JSON.parse(raw) as ReportSession

async function updateReportSession(sessionId: string, updater: (s: ReportSession) => ReportSession): Promise<ReportSession>
  - const session = await getReportSession(sessionId)
  - if (!session) throw new Error("Session not found: " + sessionId)
  - const updated = updater(session)
  - updated.lastActivityAt = new Date().toISOString()
  - await redis.set(
      REPORT_SESSION_PREFIX + sessionId,
      JSON.stringify(updated),
      "EX", REPORT_SESSION_TTL  // reset TTL on every write
    )
  - return updated

async function deleteReportSession(sessionId: string): Promise<void>
  - const redis = getRedisClient()
  - await redis.del(REPORT_SESSION_PREFIX + sessionId)

Export the ReportSession type and all four functions.

═══════════════════════════════════════════════════════════
PART C — CREATE app/api/report/start/route.ts
═══════════════════════════════════════════════════════════

import { getCurrentUser } from "@/lib/auth"
import { TIER1_BY_TYPE, CLOSING_QUESTIONS } from "@/lib/config/tier1-questions"
import { createReportSession, ReportSession } from "@/lib/config/report-session"
import { v4 as uuidv4 } from "uuid"

// Dynamic import for IncidentModel to avoid Mongo connection at build time
// Follow the pattern used in existing API routes

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: Request) {
  // 1. Auth
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!user.facilityId) {
    return Response.json({ error: "Facility ID required" }, { status: 400 })
  }

  // 2. Parse and validate body
  const body = await request.json()
  const {
    incidentType, residentId, residentName, residentRoom,
    location, incidentDate, incidentTime,
    hasInjury, injuryDescription, witnessesPresent
  } = body

  // Validate required fields
  const required = { incidentType, residentName, residentRoom, location }
  for (const [key, val] of Object.entries(required)) {
    if (!val || (typeof val === "string" && !val.trim())) {
      return Response.json({ error: `${key} is required` }, { status: 400 })
    }
  }

  // Validate incident type has Tier 1 questions
  const tier1Questions = TIER1_BY_TYPE[incidentType]
  if (!tier1Questions) {
    return Response.json(
      { error: `Unsupported incident type: ${incidentType}` },
      { status: 400 }
    )
  }

  // 3. Generate IDs
  const incidentId = `inc-${uuidv4().slice(0, 8)}`
  const sessionId = uuidv4()

  // 4. Create incident in MongoDB
  try {
    await connectToDatabase()  // use whatever DB connection pattern exists
    const { IncidentModel } = await import("@/backend/src/models/incident.model")

    const now = new Date()
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    await IncidentModel.create({
      id: incidentId,
      facilityId: user.facilityId,
      organizationId: user.orgId || user.facilityId,
      companyId: user.orgId || user.facilityId,
      incidentType,
      title: `${incidentType.charAt(0).toUpperCase() + incidentType.slice(1)} — ${residentName}`,
      description: `${incidentType} incident reported for ${residentName} in ${location}`,
      residentId: residentId || null,
      residentName,
      residentRoom,
      location,
      incidentDate: incidentDate ? new Date(incidentDate) : now,
      incidentTime: incidentTime || now.toTimeString().slice(0, 5),
      hasInjury: hasInjury ?? null,
      injuryDescription: hasInjury ? (injuryDescription || "") : null,
      witnessesPresent: witnessesPresent ?? null,
      staffId: user.userId,
      staffName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown",
      phase: "phase_1_in_progress",
      status: "in-progress",
      priority: hasInjury ? "urgent" : "medium",
      completenessScore: 0,
      createdAt: now,
      updatedAt: now,
      phaseTransitionTimestamps: {
        phase1Started: now,
      },
      redFlags: {
        hasInjury: hasInjury === true,
        carePlanViolated: false,
        stateReportDueAt: hasInjury === true ? twoHoursFromNow : undefined,
        notificationSentToAdmin: false,
      },
    })

    // 5. Create Redis session
    const session: ReportSession = {
      sessionId,
      incidentId,
      facilityId: user.facilityId,
      userId: user.userId,
      userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      userRole: user.role || "staff",
      
      incidentType,
      residentId: residentId || "",
      residentName,
      residentRoom,
      location,
      hasInjury: hasInjury ?? null,
      
      reportPhase: "tier1",
      
      tier1Questions,
      tier1Answers: {},
      tier1CompletedAt: null,
      
      fullNarrative: "",
      
      agentState: null,
      
      tier2Questions: [],
      tier2Answers: {},
      tier2DeferredIds: [],
      tier2UnknownIds: [],
      
      closingQuestions: CLOSING_QUESTIONS,
      closingAnswers: {},
      
      activeDataCollectionMs: 0,
      dataPointsPerQuestion: [],
      
      completenessScore: 0,
      completenessAtTier1: 0,
      
      startedAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
    }

    await createReportSession(session)

    // 6. Return response
    return Response.json({
      sessionId,
      incidentId,
      tier1Questions: tier1Questions.map(q => ({
        id: q.id,
        text: q.text,
        label: q.label,
        areaHint: q.areaHint,
        tier: q.tier,
        allowDefer: q.allowDefer,
        required: q.required,
      })),
      completenessScore: 0,
      phase: "tier1",
    })

  } catch (error) {
    console.error("[report/start] Error:", error)
    return Response.json(
      { error: "Failed to create incident report" },
      { status: 500 }
    )
  }
}

IMPORTANT NOTES:
- Use the same DB connection pattern as existing routes (check app/api/incidents/route.ts)
- Use the same auth pattern as existing routes (check how getCurrentUser is called)
- The IncidentModel import must be dynamic to avoid build-time MongoDB connections
- UUID can come from "uuid" package or crypto.randomUUID() — check what the project uses
- Follow existing error handling patterns

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_IR1/task-IR-1a-DONE.md`
- Verify Redis session is retrievable via redis-cli or a test script
