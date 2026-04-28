# WAiK Incident Reporting — Complete Architectural Blueprint
## Master Reference Document
## Version: 1.0 — April 2026

---

## Purpose

This document is the single source of truth for the incident reporting
rebuild. Every task file in the subsequent phases references this
blueprint. No architectural decision is made in the task files —
they execute decisions made here.

Review this document completely before approving Outputs 2-4.
Challenge anything that does not feel right. Once approved, Cursor
executes against it without ambiguity.

---

# SECTION 1 — WHAT EXISTS AND WHAT CHANGES

## Routes: Replace Six With Three

### Current routes (to be deleted after migration)

```
DELETE  app/api/agent/report/route.ts                    — streaming report agent
DELETE  app/api/agent/report-conversational/route.ts      — expert investigator (start/answer)
DELETE  app/api/agent/interview/start/route.ts            — interview work session start
DELETE  app/api/agent/interview/answer/route.ts           — interview work session answer
DELETE  app/api/agent/interview/complete/route.ts         — interview work session complete
DELETE  app/api/agent/investigate/route.ts                — streaming investigation agent
```

### New routes (replace all six)

```
POST  /api/report/start      — create incident + return Tier 1 questions
POST  /api/report/answer      — persist answer + re-analyze + return updated board
POST  /api/report/complete    — sign-off + generate clinical record + return report card
```

One session type. One Redis key pattern. One mental model.

### What stays untouched

```
KEEP   lib/agents/expert_investigator/analyze.ts         — narrative analysis + Gold Standard scoring
KEEP   lib/agents/expert_investigator/gap_questions.ts    — gap compression + question generation
KEEP   lib/agents/expert_investigator/fill_gaps.ts        — answer processing + gap re-analysis
KEEP   lib/agents/expert_investigator/finalize.ts         — investigation finalization
KEEP   lib/agents/expert_investigator/session_store.ts    — Redis session CRUD
KEEP   lib/agents/expert_investigator/state_sync.ts       — state sync helpers
KEEP   lib/gold_standards.ts                              — fall Gold Standards schema
KEEP   lib/gold_standards_extended.ts                     — extended schemas + final critical questions
KEEP   lib/agents/category_detector.ts                    — incident category detection
```

The intelligence pipeline stays as-is. These are not touched by the
incident reporting rebuild.

---

## Redis Session: Unified Model

### Current state: two session types coexist

`InvestigatorSession` at `waik:session:{id}` (expert investigator)
`InterviewWorkSession` at `waik:interview-work:{id}` (interview routes)

### New state: one session type

`ReportSession` at `waik:report:{sessionId}` TTL 7200s (2 hours)

```typescript
interface ReportSession {
  sessionId: string
  incidentId: string
  facilityId: string
  userId: string
  userName: string
  userRole: string
  
  // Incident context
  incidentType: "fall"  // pilot: falls only
  residentId: string
  residentName: string
  residentRoom: string
  location: string
  hasInjury: boolean | null
  
  // Phase tracking
  reportPhase: "tier1" | "gap_analysis" | "tier2" | "closing" | "signoff"
  
  // Tier 1 state
  tier1Questions: Tier1Question[]       // fixed questions for this incident type
  tier1Answers: Record<string, string>  // questionId → transcript
  tier1CompletedAt: string | null       // ISO timestamp
  
  // Accumulated narrative (grows with every answer)
  fullNarrative: string                 // concatenated text of all answers
  
  // Gold Standard state (from expert investigator analyze.ts)
  agentState: AgentState | null         // the structured Gold Standard analysis
  
  // Tier 2 state (from expert investigator gap_questions.ts)
  tier2Questions: GeneratedQuestion[]   // AI-generated gap-fill questions
  tier2Answers: Record<string, string>  // questionId → transcript
  tier2DeferredIds: string[]            // questions deferred via "Answer Later"
  tier2UnknownIds: string[]             // questions marked "I don't know"
  
  // Closing questions state
  closingQuestions: ClosingQuestion[]    // 3 fixed closing questions
  closingAnswers: Record<string, string>
  
  // Analytics (accumulated during session)
  activeDataCollectionMs: number        // total ms in voice/text input screens
  dataPointsPerQuestion: Array<{        // per-question gap coverage
    questionId: string
    questionText: string
    dataPointsCovered: number
    fieldsCovered: string[]
  }>
  
  // Scoring
  completenessScore: number             // current live score 0-100
  completenessAtTier1: number           // score after Tier 1 only
  
  // Timestamps
  startedAt: string                     // ISO
  lastActivityAt: string               // ISO — reset on every answer
}
```

### Session lifecycle

```
Nurse taps "Start Report"
  → POST /api/report/start
  → Creates IncidentModel in MongoDB (phase: phase_1_in_progress)
  → Creates ReportSession in Redis
  → Returns sessionId + Tier 1 questions

Nurse answers a Tier 1 question
  → POST /api/report/answer { sessionId, questionId, transcript, tier: "tier1" }
  → Appends transcript to fullNarrative in Redis session
  → Stores answer in tier1Answers
  → Returns updated question board state (which questions answered)

Nurse completes all Tier 1 questions
  → POST /api/report/answer (final Tier 1 answer)
  → Detects all Tier 1 answered
  → Calls startInvestigatorConversation(fullNarrative)
  → Returns Tier 2 question board

Nurse answers a Tier 2 question
  → POST /api/report/answer { sessionId, questionId, transcript, tier: "tier2" }
  → Appends transcript to fullNarrative
  → Calls answerInvestigatorQuestion(questionId, transcript)
  → Expert investigator re-analyzes, removes covered gaps, generates new questions
  → Updates Redis session with new board state
  → Returns updated question board + updated completenessScore

Nurse defers remaining questions
  → POST /api/report/answer { sessionId, questionId: "__DEFER_ALL__" }
  → Marks remaining questions as deferred in Redis session
  → Updates MongoDB incident with current state
  → Returns dashboard redirect

Nurse returns to complete deferred questions
  → POST /api/report/answer { sessionId, questionId, transcript, tier: "tier2" }
  → Same flow as above — session still alive in Redis (2hr TTL reset on every write)

Nurse crosses completion threshold → closing questions appear
  → POST /api/report/answer (final Tier 2 answer that crosses threshold)
  → Detects completeness >= facility threshold (default 75%)
  → Returns closing questions board

Nurse answers closing questions
  → POST /api/report/answer { sessionId, questionId, transcript, tier: "closing" }
  → Stores in closingAnswers

Nurse signs off
  → POST /api/report/complete { sessionId, editedSections?, signature }
  → Generates clinical record via Clinical Record Generator agent
  → Verifies via Verification Agent
  → Writes final state to MongoDB incident:
    - initialReport subdocument (narrative, signature, witnesses)
    - investigation subdocument (goldStandard, subTypeData, score)
    - analytics fields (completenessAtSignoff, activeDataCollectionSeconds, etc.)
    - phase: "phase_1_complete"
    - phaseTransitionTimestamps.phase1Signed: now
  → Deletes Redis session
  → Fires Phase 2 notification to DON/admin
  → Returns report card data
```

---

# SECTION 2 — API CONTRACTS

## POST /api/report/start

### Request

```typescript
{
  incidentType: "fall"                 // pilot: falls only
  residentId: string
  residentName: string
  residentRoom: string
  location: string
  incidentDate: string                 // ISO date
  incidentTime: string                 // "06:15"
  hasInjury: boolean | null            // true / false / null (not sure)
  injuryDescription?: string           // if hasInjury true
  witnessesPresent?: boolean
}
```

### Response (200)

```typescript
{
  sessionId: string
  incidentId: string
  tier1Questions: Array<{
    id: string                          // "t1-q1", "t1-q2", etc.
    text: string                        // the question text
    label: string                       // "Q1", "Q2", etc.
    areaHint: string                    // "Narrative", "Resident Statement", etc.
    tier: "tier1"
    allowDefer: false                   // Tier 1 cannot be deferred
    required: true
  }>
  completenessScore: 0
  phase: "tier1"
}
```

### Server behavior

1. Validate auth (withAuth wrapper)
2. Validate facilityId from currentUser
3. Create IncidentModel in MongoDB:
   - id: generated UUID
   - facilityId, organizationId from user
   - incidentType, residentId, residentName, residentRoom, location
   - incidentDate, incidentTime, hasInjury, injuryDescription
   - staffId: currentUser.userId
   - staffName: currentUser.firstName + " " + currentUser.lastName
   - phase: "phase_1_in_progress"
   - phaseTransitionTimestamps.phase1Started: now
   - redFlags.hasInjury: hasInjury (triggers admin red alert if true)
   - status: "in-progress"
   - priority: hasInjury ? "urgent" : "medium"
4. Load Tier 1 questions from config:
   - For falls: the 5 fixed questions from the co-founder meetings
   - Source: lib/config/tier1-questions.ts (new file — hardcoded per incident type)
5. Create ReportSession in Redis with all initial state
6. Return sessionId + tier1Questions

---

## POST /api/report/answer

### Request

```typescript
{
  sessionId: string
  questionId: string                   // "t1-q1", "t2-q3", "c-q1", or "__DEFER_ALL__"
  transcript: string                   // the nurse's answer (empty if deferring)
  tier: "tier1" | "tier2" | "closing"
  activeMs?: number                    // milliseconds spent in the input screen for this answer
}
```

### Response (200) — varies by state

#### After a normal Tier 1 answer:

```typescript
{
  status: "tier1_updated"
  questionId: string
  answered: string[]                   // all answered question IDs
  remaining: string[]                  // unanswered question IDs
  completenessScore: number            // rough estimate from Tier 1 coverage
  allTier1Complete: false
}
```

#### After the LAST Tier 1 answer (triggers gap analysis):

```typescript
{
  status: "gap_analysis_complete"
  tier2Questions: Array<{
    id: string                          // "t2-q1", "t2-q2", etc.
    text: string
    label: string                       // "Tier 2"
    areaHint: string                    // "Environment", "Timeline", etc.
    tier: "tier2"
    allowDefer: true
    required: false
  }>
  completenessScore: number            // from Gold Standard analysis
  completenessAtTier1: number          // locked at this point
  totalGapsIdentified: number          // how many Gold Standard fields were missing
  questionsGenerated: number           // how many compressed questions were created
}
```

#### After a Tier 2 answer:

```typescript
{
  status: "tier2_updated"
  questionId: string
  updatedFields: string[]              // Gold Standard fields filled by this answer
  questionsRemoved: string[]           // question IDs no longer needed (implicitly answered)
  newQuestions: Array<{...}>           // any new questions generated from revealed gaps
  remainingQuestions: Array<{...}>     // all still-unanswered questions
  completenessScore: number
  thresholdReached: boolean            // true if >= facility threshold
  dataPointsCovered: number            // how many fields this single answer addressed
}
```

#### After threshold reached and closing questions returned:

```typescript
{
  status: "closing_ready"
  closingQuestions: Array<{
    id: string                          // "c-q1", "c-q2", "c-q3"
    text: string
    label: string                       // "Closing"
    areaHint: string
    tier: "closing"
    allowDefer: false
    required: true
  }>
  completenessScore: number
}
```

#### After a closing question answer:

```typescript
{
  status: "closing_updated"
  answered: string[]
  remaining: string[]
  allClosingComplete: boolean
}
```

#### After deferral (__DEFER_ALL__):

```typescript
{
  status: "deferred"
  deferredQuestionIds: string[]
  completenessScore: number
  message: "Your progress has been saved. We will remind you in 2 hours."
}
```

### Server behavior (detailed flow)

```
1. Load ReportSession from Redis
   If not found → 404

2. If questionId === "__DEFER_ALL__":
   - Mark all unanswered tier2 questions as deferred
   - Write current state to MongoDB incident (partial save)
   - Update Redis session with deferred state
   - Return deferred response

3. Append transcript to session.fullNarrative
   session.fullNarrative += "\n\n" + transcript

4. Record activeMs:
   session.activeDataCollectionMs += (activeMs ?? 0)

5. Store answer in appropriate bucket:
   if tier === "tier1": session.tier1Answers[questionId] = transcript
   if tier === "tier2": session.tier2Answers[questionId] = transcript
   if tier === "closing": session.closingAnswers[questionId] = transcript

6. BRANCH by tier:

   TIER 1:
   - Check if all tier1Questions are now answered
   - If not all answered: return tier1_updated
   - If all answered:
     a. Record completenessAtTier1 (rough heuristic or quick LLM score)
     b. Call startInvestigatorConversation({
          incidentId: session.incidentId,
          narrative: session.fullNarrative,
          investigatorId: session.userId,
          investigatorName: session.userName,
          reporterName: session.userName
        })
     c. Store returned AgentState in session
     d. Store returned questions as session.tier2Questions
     e. Record tier2QuestionsGenerated count
     f. Update Redis session
     g. Return gap_analysis_complete with tier2Questions

   TIER 2:
   - Call answerInvestigatorQuestion({
       sessionId: <investigator session ID>,
       questionId,
       answerText: transcript,
       answeredBy: session.userId,
       answeredByName: session.userName,
       method: "voice"  // or "text" based on input source
     })
   - Process response:
     a. updatedFields → record in dataPointsPerQuestion
     b. Remove implicitly answered questions from board
     c. Add any new questions from response
     d. Update completenessScore from response
     e. Check if completenessScore >= facility threshold
     f. If threshold reached:
        - Return closing_ready with 3 closing questions
     g. If not threshold:
        - Return tier2_updated with remaining board

   CLOSING:
   - Store closing answer
   - Check if all 3 closing questions answered
   - If all answered: return allClosingComplete: true
   - If not: return closing_updated

7. Update Redis session (reset TTL)
8. Write periodic checkpoint to MongoDB (every 3rd answer or every 60 seconds):
   - Update incident completenessScore
   - Update questionsAnswered count
   - This is a background write — do not block the response
```

---

## POST /api/report/complete

### Request

```typescript
{
  sessionId: string
  editedSections?: {                    // nurse's edits to the generated report
    narrative?: string
    residentStatement?: string
    interventions?: string
    contributingFactors?: string
    recommendations?: string
  }
  signature: {
    declaration: "I confirm this report reflects my observations and actions."
    signedAt: string                    // ISO timestamp
  }
}
```

### Response (200)

```typescript
{
  status: "completed"
  incidentId: string
  reportCard: {
    completenessScore: number
    facilityAverage: number
    personalAverage: number
    currentStreak: number
    bestStreak: number
    coachingTips: string[]              // 2-3 specific improvement suggestions
    totalQuestionsAsked: number
    totalActiveSeconds: number
    dataPointsCaptured: number
  }
}
```

### Server behavior

```
1. Load ReportSession from Redis
   If not found → 404

2. Generate clinical record:
   a. Concatenate: fullNarrative + closing answers
   b. Call Clinical Record Generator (new agent — or extend finalize.ts):
      - Input: full narrative, Tier 1 answers (labeled), Tier 2 answers (labeled),
               closing answers (labeled), Gold Standard state
      - Output: structured clinical record with sections:
        { narrative, residentStatement, interventions,
          contributingFactors, recommendations, environmentalAssessment }
   c. Apply nurse's edits from editedSections (override generated text)

3. Call Verification Agent (new agent — or extend finalize.ts):
   - Compare clinical record against original narrative
   - Verify: nothing added, nothing removed, clinical significance surfaced
   - Flag any discrepancies (log only — do not block sign-off)

4. Write final state to MongoDB IncidentModel:

   $set:
     phase: "phase_1_complete"
     completenessScore: session.completenessScore
     completenessAtSignoff: session.completenessScore
     completenessAtTier1Complete: session.completenessAtTier1
     tier2QuestionsGenerated: session.tier2Questions.length
     questionsAnswered: count of answered (not deferred/unknown)
     questionsDeferred: session.tier2DeferredIds.length
     questionsMarkedUnknown: session.tier2UnknownIds.length
     activeDataCollectionSeconds: Math.round(session.activeDataCollectionMs / 1000)
     dataPointsPerQuestion: session.dataPointsPerQuestion
     
     initialReport:
       capturedAt: now
       narrative: session.fullNarrative (original words — never edited)
       enhancedNarrative: generated clinical record text
       residentState: extracted from answers
       environmentNotes: extracted from answers
       recordedById: session.userId
       recordedByName: session.userName
       recordedByRole: session.userRole
       immediateIntervention:
         action: closing answer about interventions
         timestamp: now
       witnesses: [] (populated if witness statements were captured)
       signature:
         signedBy: session.userId
         signedByName: session.userName
         signedAt: signature.signedAt
         role: session.userRole
         declaration: signature.declaration
     
     investigation:
       status: "in-progress" (Phase 2 not yet started)
       goldStandard: session.agentState.global_standards
       subTypeData: session.agentState.sub_type_data
       subtype: session.agentState.sub_type
       score: session.completenessScore
       completenessScore: session.completenessScore
     
     summary: generated clinical record (first 500 chars)
     
     phaseTransitionTimestamps:
       phase1Started: session.startedAt
       phase1Signed: now
     
     redFlags:
       hasInjury: session.hasInjury
       stateReportDueAt: if hasInjury, now + 2 hours
   
   $push:
     auditTrail: {
       action: "signed"
       performedBy: session.userId
       performedByName: session.userName
       timestamp: now
     }

5. Generate report card data:
   a. Compute facility average from recent incidents
   b. Compute personal average for this staff member
   c. Compute streak (consecutive above-85% reports)
   d. Generate coaching tips via LLM:
      - Input: Gold Standard analysis, which fields were missed,
               which were captured in Tier 1 (implicitly — reward those)
      - Output: 2-3 specific, actionable tips
      - Temperature: 0.3, max_tokens: 200

6. Fire Phase 2 notification:
   - Find all DON and administrator users for this facility
   - Create notification record in MongoDB
   - Call push stub (or real push if task-12 is complete)

7. Generate and store embedding for facility-wide intelligence:
   - Embed: fullNarrative + clinical record
   - Store on incident record: investigation.embedding (new field)
   - This enables facility-wide RAG in Phase 3

8. Delete ReportSession from Redis

9. Invalidate cached stats and performance data:
   - redis.del(`waik:stats:${facilityId}`)
   - redis.del(`waik:perf:${userId}:${facilityId}`)

10. Return report card response
```

---

# SECTION 3 — THE EXPERT INVESTIGATOR INTEGRATION

## How the existing pipeline connects to the new routes

The expert investigator pipeline (analyze.ts, gap_questions.ts,
fill_gaps.ts, finalize.ts) is the intelligence engine. The new
API routes are the orchestration layer. Here is exactly how they
connect:

### On Tier 1 completion → gap analysis

```
POST /api/report/answer (final Tier 1 answer detected)
  │
  ├── Concatenate all Tier 1 answers into fullNarrative
  │
  ├── Call: analyzeNarrativeAndScore(fullNarrative)
  │   │   from: lib/agents/expert_investigator/analyze.ts
  │   │
  │   │   What it does:
  │   │   - Sends narrative to GPT-4o-mini with tool/function calling
  │   │   - LLM extracts Gold Standard field values from the narrative
  │   │   - Returns: AgentState with populated global_standards fields
  │   │   - Returns: score (0-100 completeness)
  │   │   - Returns: feedback text
  │   │   - Detects fall subtype (bed, wheelchair, slip, lift)
  │   │
  │   └── Result: { state: AgentState, score, feedback, subtype }
  │
  ├── Call: generateGapQuestions(state, incidentId, ...)
  │   │   from: lib/agents/expert_investigator/gap_questions.ts
  │   │
  │   │   What it does:
  │   │   - Examines AgentState for null/empty fields
  │   │   - Groups missing fields by category (environment, timeline, etc.)
  │   │   - Sends to GPT-4o-mini: "compress these gaps into minimal questions"
  │   │   - Returns: questions[] with text and target fields
  │   │   - Returns: missingFieldLabels[] (for display)
  │   │
  │   └── Result: { questions, missingFields }
  │
  ├── Store AgentState in ReportSession (Redis)
  ├── Store questions as session.tier2Questions
  │
  └── Return tier2 question board to frontend
```

### On each Tier 2 answer

```
POST /api/report/answer (Tier 2 answer)
  │
  ├── Call: fillGapsWithAnswer(state, questionId, answerText)
  │   │   from: lib/agents/expert_investigator/fill_gaps.ts
  │   │
  │   │   What it does:
  │   │   - Sends answer + current AgentState to GPT-4o-mini
  │   │   - LLM uses tool calls to update specific Gold Standard fields
  │   │   - Returns: updated AgentState
  │   │   - Returns: updatedFields[] (which fields this answer filled)
  │   │   - Returns: remainingMissing[] (what is still empty)
  │   │
  │   └── Result: { state, updatedFields, remainingMissing }
  │
  ├── Record dataPointsPerQuestion entry:
  │     { questionId, questionText, dataPointsCovered: updatedFields.length,
  │       fieldsCovered: updatedFields }
  │
  ├── If remainingMissing.length > 0:
  │   │
  │   ├── Call: generateGapQuestions(updatedState, ...) again
  │   │   - New questions may be generated for newly revealed gaps
  │   │   - Questions whose fields are now filled are removed from the board
  │   │
  │   ├── Update ReportSession with new board state
  │   │
  │   └── Return tier2_updated with remaining questions
  │
  └── If remainingMissing.length === 0 OR completeness >= threshold:
      │
      ├── Return closing_ready with 3 closing questions
      │
      └── (Do NOT finalize yet — closing questions must be answered first)
```

### On sign-off (POST /api/report/complete)

```
POST /api/report/complete
  │
  ├── Call: finalizeInvestigation(incidentId, state)
  │   │   from: lib/agents/expert_investigator/finalize.ts
  │   │
  │   │   What it does:
  │   │   - Writes goldStandard and subTypeData to incident.investigation
  │   │   - Sets investigation.status
  │   │   - Records final completion state
  │   │
  │   └── Result: finalized investigation record
  │
  ├── Generate clinical record (new agent call or extension of finalize)
  ├── Verify clinical record (new verification step)
  │
  └── Write everything to MongoDB (see Section 2 detail)
```

---

# SECTION 4 — TIER 1 QUESTIONS (CONFIGURATION)

## Source: New file `lib/config/tier1-questions.ts`

Tier 1 questions are fixed, human-authored, and identical for every
incident of the same type. They are not AI-generated. They come from
Scott Kallstrom's clinical expertise.

```typescript
// lib/config/tier1-questions.ts

export interface Tier1Question {
  id: string
  text: string
  label: string
  areaHint: string
  tier: "tier1"
  allowDefer: false
  required: true
}

export const FALL_TIER1_QUESTIONS: Tier1Question[] = [
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

export const CLOSING_QUESTIONS: Tier1Question[] = [
  {
    id: "c-q1",
    text: "What immediate interventions did you put in place for this resident?",
    label: "Closing 1",
    areaHint: "Interventions",
    tier: "closing" as any,
    allowDefer: false,
    required: true
  },
  {
    id: "c-q2",
    text: "What do you think are the contributing factors or root cause?",
    label: "Closing 2",
    areaHint: "Root Cause",
    tier: "closing" as any,
    allowDefer: false,
    required: true
  },
  {
    id: "c-q3",
    text: "What do you recommend should be done to prevent this from happening again?",
    label: "Closing 3",
    areaHint: "Recommendations",
    tier: "closing" as any,
    allowDefer: false,
    required: true
  }
]

// Map incident types to their Tier 1 questions
export const TIER1_BY_TYPE: Record<string, Tier1Question[]> = {
  fall: FALL_TIER1_QUESTIONS,
  // medication_error: MEDICATION_TIER1_QUESTIONS,  // future
  // resident_conflict: CONFLICT_TIER1_QUESTIONS,   // future
  // wound_injury: WOUND_TIER1_QUESTIONS,           // future
  // abuse_neglect: ABUSE_TIER1_QUESTIONS,           // future
}
```

---

# SECTION 5 — FRONTEND STATE MACHINE INTEGRATION

## Current state (from 04-staff-report-page.md)

The ReportPhase state machine exists with correct phases. VoiceInputScreen
is wired. But transitions are stubbed — no real API calls, no real
question board data, answers stored only in React state.

## Target state

The report page makes real API calls at three moments:

1. **On "Start Report" from resident_splash:**
   `POST /api/report/start` → receives sessionId + Tier 1 questions

2. **On every answer submission (VoiceInputScreen onSubmit):**
   `POST /api/report/answer` → receives updated board state

3. **On sign-off:**
   `POST /api/report/complete` → receives report card data

### Frontend state additions

```typescript
// New state variables needed on the report page

const [sessionId, setSessionId] = useState<string | null>(null)     // real session
const [tier1Questions, setTier1Questions] = useState<Question[]>([]) // from API
const [tier2Questions, setTier2Questions] = useState<Question[]>([]) // from API
const [closingQuestions, setClosingQuestions] = useState<Question[]>([])
const [completenessScore, setCompletenessScore] = useState(0)       // from API
const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
const [isSubmitting, setIsSubmitting] = useState(false)             // loading state
const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecord | null>(null)
const [reportCardData, setReportCardData] = useState<ReportCard | null>(null)
const [dataCollectionStartMs, setDataCollectionStartMs] = useState(0) // timing

// Track time spent in voice input
const [currentQuestionStartMs, setCurrentQuestionStartMs] = useState(0)
```

### Question board component data flow

```
tier1_board phase:
  questions = tier1Questions (from /api/report/start response)
  answeredIds = from answeredIds state
  onQuestionTap(question) → setActiveQuestion, setPhase("answering")
  
answering phase:
  <VoiceInputScreen
    question={activeQuestion.text}
    onSubmit={async (transcript) => {
      const startMs = currentQuestionStartMs
      const activeMs = Date.now() - startMs
      
      const response = await fetch("/api/report/answer", {
        body: { sessionId, questionId: activeQuestion.id, transcript,
                tier: activeQuestion.tier, activeMs }
      })
      
      const data = await response.json()
      
      // Update state from response
      setCompletenessScore(data.completenessScore)
      setAnsweredIds(prev => new Set([...prev, activeQuestion.id]))
      
      // Handle response status
      if (data.status === "gap_analysis_complete") {
        setTier2Questions(data.tier2Questions)
        setPhase("tier2_board")
      } else if (data.status === "closing_ready") {
        setClosingQuestions(data.closingQuestions)
        setPhase("closing")
      } else if (data.allClosingComplete) {
        setPhase("signoff")
      } else {
        // Return to appropriate board
        if (activeQuestion.tier === "tier2" && data.remainingQuestions) {
          setTier2Questions(data.remainingQuestions)
        }
        returnToBoard(activeQuestion.tier)
      }
    }}
  />

tier2_board phase:
  questions = tier2Questions (updated after each answer from API response)
  Questions that were removed by the API (implicitly answered) fade out
  New questions that appeared from the API response fade in
  completenessScore ring updates in real time
  "Answer Later" option visible — calls /api/report/answer with __DEFER_ALL__
  
closing phase:
  questions = closingQuestions (3 fixed)
  Same answer flow as tier2

signoff phase:
  Shows generated clinical record (from /api/report/complete preview)
  Editable sections
  Signature button → POST /api/report/complete
  
reportcard phase:
  Shows data from /api/report/complete response
  reportCardData populates the UI
```

---

# SECTION 6 — RAG AND INTELLIGENCE STRATEGY

## Current state

Embeddings are in-process memory only. Cosine similarity runs over
a single incident's Q&A list. No cross-incident search exists.

## Target architecture (three layers)

### Layer 1 — Incident-Level Embedding (at sign-off)

When POST /api/report/complete runs, after writing the incident to
MongoDB, generate an embedding of the full clinical record:

```
text = clinicalRecord.narrative + "\n" +
       clinicalRecord.residentStatement + "\n" +
       clinicalRecord.interventions + "\n" +
       clinicalRecord.contributingFactors + "\n" +
       clinicalRecord.recommendations

embedding = await generateEmbedding(text)  // text-embedding-3-small, 1536 dims

// Store on incident record
await IncidentModel.updateOne(
  { id: incidentId },
  { $set: { "investigation.embedding": embedding } }
)
```

This creates a searchable vector per incident.

### Layer 2 — Facility-Wide Vector Search

Two options for retrieval:

**Option A — MongoDB Atlas Vector Search (preferred if available):**
MongoDB Atlas supports $vectorSearch natively. Create a vector search
index on `investigation.embedding` and query with:

```javascript
db.incidents.aggregate([
  {
    $vectorSearch: {
      queryVector: queryEmbedding,
      path: "investigation.embedding",
      numCandidates: 100,
      limit: 10,
      filter: { facilityId: "fac-sunrise-mpls-001" }
    }
  }
])
```

This is the cleanest path — no external vector database needed.

**Option B — In-process fallback:**
If Atlas Vector Search is not available on the current MongoDB tier,
load all incident embeddings for the facility into memory (feasible
for pilot scale — 10-50 incidents) and run cosine similarity in Node.

For the pilot: Option B is acceptable. For production: Option A.

### Layer 3 — Intelligence Q&A Rebuild

The current intelligence-qa.ts searches one incident. The rebuild
searches across all facility incidents:

```
User query: "What are the most common fall locations this month?"

1. Embed query → queryEmbedding
2. Vector search across all facility incidents (Layer 2)
3. Retrieve top 10 most relevant incidents
4. Extract structured data from their Gold Standard records
5. Send to LLM with structured context:
   "Based on these 10 incident records from this facility,
    answer the following question: [query]"
6. Return plain-language response
```

This transforms WAiK Intelligence from per-incident search to
facility-wide institutional memory.

---

# SECTION 7 — ANALYTICS AND DATA STRATEGY

## What WAiK captures on every incident (the four Scott metrics + more)

### At sign-off (written to MongoDB incident record)

```
tier2QuestionsGenerated: number     // how many Tier 2 questions the AI produced
questionsAnswered: number           // how many the nurse answered (not deferred/unknown)
questionsDeferred: number           // how many were deferred via "Answer Later"
questionsMarkedUnknown: number      // how many were marked "I don't know"
activeDataCollectionSeconds: number // total seconds in voice/text input screens
completenessAtTier1Complete: number // score after Tier 1 only (before gap analysis)
completenessAtSignoff: number       // final score at Phase 1 signature
dataPointsPerQuestion: Array<{     // per-question effectiveness measurement
  questionId: string
  questionText: string
  dataPointsCovered: number         // how many Gold Standard fields this answer filled
  fieldsCovered: string[]           // which specific fields
}>
```

### Derived metrics (computed from the above, not stored separately)

```
questionsToCompletion = questionsAnswered       // Scott metric #1
timeToCollectData = activeDataCollectionSeconds  // Scott metric #2
dataPointsPerQ = avg(dataPointsPerQuestion.map(q => q.dataPointsCovered))  // Scott metric #3
completionPercentage = completenessAtSignoff     // Scott metric #4
```

### What this data enables

**Immediate (pilot):**
- Staff performance dashboards (average completeness, streak, improvement)
- Facility-level quality metrics (average questions to completion, time trends)
- Report card coaching tips (based on which fields were missed most often)

**Medium-term (3-6 months):**
- Question effectiveness ranking (which phrasings produce the most data points)
- Staff improvement tracking (does this nurse need fewer questions over time?)
- Facility benchmarking (how does this community compare to others?)

**Long-term (6-18 months):**
- Question Compressor training data (retrain or update system prompts with
  proven effective question phrasings)
- Predictive analytics (residents with increasing incident frequency)
- MDS correlation (which documented conditions map to enhanced reimbursement)

### The data WAiK infers (not captured directly — computed from patterns)

```
Fall clustering: 3+ falls in the same wing within 7 days
Resident escalation: 3+ incidents for one resident within 30 days
Time-of-day patterns: incidents clustering at specific shift windows
Documentation quality trajectory: 8-week rolling completeness trend
Staff coaching opportunities: staff with lowest avg completeness
Question formulation effectiveness: questions with highest avg dataPointsCovered
```

These inferences power the weekly intelligence report and the admin
dashboard anomaly flags.

---

# SECTION 8 — PHASE STRUCTURE FOR OUTPUTS 2-4

## Output 2 — Phase IR-1: Frontend + Backend Wiring (6-8 tasks)

```
IR-1a: Create /api/report/start route
IR-1b: Create /api/report/answer route (Tier 1 logic)
IR-1c: Create /api/report/answer route (Tier 2 logic — expert investigator integration)
IR-1d: Create /api/report/answer route (closing + deferral logic)
IR-1e: Create /api/report/complete route (sign-off + clinical record)
IR-1f: Wire report page to real API calls (replace stubs)
IR-1g: Question board component (real data-driven board)
IR-1h: Delete old routes + verification rollup
```

## Output 3 — Phase IR-2: Intelligence Pipeline (5-7 tasks)

```
IR-2a: Embedding generation at sign-off
IR-2b: Facility-wide vector search setup (Atlas or in-process)
IR-2c: Intelligence Q&A agent rebuild (cross-incident search)
IR-2d: Clinical Record Generator agent
IR-2e: Verification Agent
IR-2f: Report card coaching tip generation
IR-2g: Integration verification
```

## Output 4 — Phase IR-3: Analytics + Data Strategy (4-6 tasks)

```
IR-3a: Analytics aggregation endpoints (facility-level metrics)
IR-3b: Weekly intelligence report auto-generation
IR-3c: Question effectiveness tracking and ranking
IR-3d: Staff improvement trajectory computation
IR-3e: Old route cleanup + migration verification
IR-3f: Complete integration test
```

---

# SECTION 9 — WHAT THIS BLUEPRINT DOES NOT COVER (explicitly deferred)

- Phase 2 Investigation workspace (separate phase — already designed)
- Assessment voice flow (same architecture, different Gold Standards)
- Push notification infrastructure (task-12 — already designed)
- PWA offline queue for voice reports (task-04 — already designed)
- Multi-incident-type Gold Standards (pilot is falls only)
- EHR integration (post-pilot)
- Machine learning model training on question effectiveness (6-18 month horizon)

---

# SECTION 10 — APPROVAL CHECKLIST

Before Outputs 2-4 are written, confirm:

- [ ] Three new routes (/api/report/start, /answer, /complete) replace six old routes
- [ ] One Redis session type (ReportSession at waik:report:{id})
- [ ] Expert investigator pipeline (analyze, gap_questions, fill_gaps, finalize) stays untouched
- [ ] Tier 1 questions are hardcoded per incident type in lib/config/tier1-questions.ts
- [ ] Closing questions are 3 fixed questions (not AI-generated)
- [ ] Frontend makes real API calls at three moments (start, each answer, sign-off)
- [ ] Clinical record generated at sign-off (not during reporting)
- [ ] Embeddings generated at sign-off for facility-wide intelligence
- [ ] Analytics fields populated at sign-off from session state
- [ ] Report card generated at sign-off with coaching tips
- [ ] Falls only for pilot — other incident types deferred
- [ ] Old routes deleted after new routes are verified
