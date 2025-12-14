# WAiK Expert Investigator

**Version**: 1.0  
**Last Updated**: December 2024  
**Location**: `lib/agents/expert_investigator/`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Session Management](#session-management)
4. [Starting a Conversation](#starting-a-conversation)
5. [Answering Questions](#answering-questions)
6. [Gap Analysis](#gap-analysis)
7. [Scoring System](#scoring-system)
8. [Question Generation](#question-generation)
9. [Finalization](#finalization)
10. [Module Reference](#module-reference)
11. [API Integration](#api-integration)
12. [Usage Examples](#usage-examples)

---

## Overview

The **Expert Investigator** is a conversational agent system that guides administrators through gap-filling investigations. Unlike the automated Investigation Agent, the Expert Investigator is interactive — it analyzes answers in real-time, updates scores, and generates new questions based on what's still missing.

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Mode** | Interactive, conversational |
| **Trigger** | Admin starts investigation on incident detail page |
| **Duration** | 5-30 minutes (depends on gaps) |
| **Input** | Initial narrative + answers to questions |
| **Output** | Updated incident, scores, feedback, completion status |
| **User** | Administrator or investigator |

### Use Cases

1. **Gap-Filling Interview**: Admin answers questions about an incident
2. **Real-Time Scoring**: See completeness score update after each answer
3. **Dynamic Questions**: New questions generated based on remaining gaps
4. **Compliance Audit**: Ensure all required fields are documented

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXPERT INVESTIGATOR ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐     │
│   │                         graph.ts                                  │     │
│   │                   (Main Orchestrator)                             │     │
│   │                                                                   │     │
│   │   Exports:                                                        │     │
│   │   ├── startInvestigatorConversation()                             │     │
│   │   └── answerInvestigatorQuestion()                                │     │
│   └───────────────────────────────────────────────────────────────────┘     │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              │               │               │                              │
│              ▼               ▼               ▼                              │
│   ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐                   │
│   │   analyze.ts    │ │gap_questions│ │  fill_gaps.ts   │                   │
│   │                 │ │    .ts      │ │                 │                   │
│   │ Narrative       │ │ Question    │ │ Answer          │                   │
│   │ Analysis &      │ │ Generation  │ │ Processing      │                   │
│   │ Scoring         │ │ from Gaps   │ │ & Field Fill    │                   │
│   └─────────────────┘ └─────────────┘ └─────────────────┘                   │
│              │               │               │                              │
│              └───────────────┼───────────────┘                              │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              │               │               │                              │
│              ▼               ▼               ▼                              │
│   ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐                   │
│   │session_store.ts │ │state_sync.ts│ │  finalize.ts    │                   │
│   │                 │ │             │ │                 │                   │
│   │ In-Memory       │ │ Database    │ │ Complete        │                   │
│   │ Session State   │ │ Sync        │ │ Investigation   │                   │
│   └─────────────────┘ └─────────────┘ └─────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Session Management

### Session Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   START     │────►│   ACTIVE    │────►│  ANSWERING  │────►│  COMPLETE   │
│             │     │             │     │             │     │             │
│ Create      │     │ Questions   │     │ Process     │     │ Finalize    │
│ Session     │     │ Pending     │     │ Answer      │     │ & Delete    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │◄──────────────────┘
                           │   (more questions)
```

### Session Interface

```typescript
interface InvestigatorSession {
  id: string                    // UUID session identifier
  incidentId: string            // Associated incident
  investigatorId: string        // Admin/investigator user ID
  investigatorName: string      // Admin/investigator name
  nurseName: string             // Original reporter's name
  
  // Current State
  state: AgentState             // Gold standard fields
  score: number                 // Current overall score
  completenessScore: number     // Percentage complete
  feedback: string              // Current AI feedback
  
  // Baseline (Initial Analysis)
  baseScore: number             // Score before any answers
  baseCompletenessScore: number // Completeness before answers
  baseFeedback: string          // Initial feedback
  baseStrengths: string[]       // Initially filled fields
  baseGaps: string[]            // Initially missing fields
  
  // Question Tracking
  pendingQuestions: PendingQuestion[]
  missingFields: MissingFieldDescriptor[]
  askedQuestionIds: string[]
  askedQuestions: string[]      // Question texts asked
  answersGiven: number          // Count of answers
  
  // Timestamps
  createdAt: number
  updatedAt: number
}
```

### Session Store

Sessions are stored in memory (not database):

```typescript
// session_store.ts
const sessions = new Map<string, InvestigatorSession>()

export function createSession(session: InvestigatorSession): void {
  sessions.set(session.id, session)
}

export function getSession(sessionId: string): InvestigatorSession | undefined {
  return sessions.get(sessionId)
}

export function updateSession(
  sessionId: string,
  updater: (current: InvestigatorSession) => InvestigatorSession
): void {
  const current = sessions.get(sessionId)
  if (current) {
    sessions.set(sessionId, updater(current))
  }
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId)
}
```

---

## Starting a Conversation

### Function Signature

```typescript
export async function startInvestigatorConversation(
  input: StartConversationInput
): Promise<StartConversationResult>
```

### Input

```typescript
interface StartConversationInput {
  incidentId: string          // Required: Incident to investigate
  narrative?: string          // Optional: Override narrative
  investigatorId: string      // Required: Admin's user ID
  investigatorName: string    // Required: Admin's name
  assignedStaffIds?: string[] // Optional: Staff to assign questions
  reporterName: string        // Required: Original reporter's name
}
```

### Process

```
1. Load incident from database
2. Extract narrative (from input or incident)
3. Analyze narrative with AI
   └── Classify subtype
   └── Score completeness
   └── Identify filled/missing fields
4. Generate gap questions
   └── Based on missing fields
   └── Tailored to narrative
5. Save questions to database
6. Create session
7. Return initial state
```

### Output

```typescript
interface StartConversationResult {
  sessionId: string           // UUID for this conversation
  incidentId: string          // Incident being investigated
  score: number               // Initial score (0-100)
  completenessScore: number   // Initial completeness percentage
  feedback: string            // AI feedback on report quality
  strengths: string[]         // Well-documented fields
  gaps: string[]              // Missing fields
  questions: PendingQuestion[]// Questions to answer
  missingFieldLabels: string[]// Human-readable gap labels
  subtypeLabel?: string       // e.g., "wheelchair fall"
}
```

### Example

```typescript
const result = await startInvestigatorConversation({
  incidentId: "inc-1734567890123",
  investigatorId: "user-admin-1",
  investigatorName: "Dr. Smith",
  assignedStaffIds: ["user-1"],
  reporterName: "Sarah Johnson",
})

// Result:
{
  sessionId: "a1b2c3d4-...",
  incidentId: "inc-1734567890123",
  score: 65,
  completenessScore: 58,
  feedback: "Good initial details. Missing information about vitals...",
  strengths: ["resident_name", "room_number", "staff_narrative"],
  gaps: ["vitals_taken_post_fall", "physician_notified"],
  questions: [
    { id: "q-123", text: "Were vitals taken after the fall?", ... },
    { id: "q-124", text: "Was the physician notified?", ... }
  ],
  missingFieldLabels: ["post-fall vitals", "physician notification"],
  subtypeLabel: "wheelchair fall"
}
```

---

## Answering Questions

### Function Signature

```typescript
export async function answerInvestigatorQuestion(
  input: AnswerQuestionInput
): Promise<AnswerQuestionResult>
```

### Input

```typescript
interface AnswerQuestionInput {
  sessionId: string           // Session from startConversation
  questionId: string          // Question being answered
  answerText: string          // The answer
  answeredBy: string          // User ID of answerer
  answeredByName: string      // Name of answerer
  method?: "text" | "voice"   // How answer was captured
  assignedStaffIds?: string[] // Staff for follow-up questions
}
```

### Process

```
1. Validate session exists
2. Find question in pending list
3. Record answer to database
4. Fill gaps based on answer
   └── Parse answer for field values
   └── Update AgentState
5. Check remaining gaps
6. If gaps remain:
   └── Generate new questions
   └── Update session
   └── Return "pending" status
7. If no gaps:
   └── Finalize investigation
   └── Delete session
   └── Return "completed" status
```

### Output

```typescript
interface AnswerQuestionResult {
  sessionId: string
  incidentId: string
  status: "pending" | "completed"  // More questions or done
  score: number                    // Current score
  completenessScore: number        // Current completeness
  feedback: string                 // Current feedback
  nextQuestions: PendingQuestion[] // New questions (if pending)
  updatedFields: string[]          // Fields filled by this answer
  remainingMissing: string[]       // Still missing fields
  details?: {
    strengths: string[]
    gaps: string[]
  }
  breakdown: {
    completeness: number
  }
}
```

### Example Flow

```typescript
// Answer 1
const result1 = await answerInvestigatorQuestion({
  sessionId: "a1b2c3d4-...",
  questionId: "q-123",
  answerText: "Yes, vitals were taken. BP was 140/90, pulse 88.",
  answeredBy: "user-admin-1",
  answeredByName: "Dr. Smith",
  method: "text"
})
// result1.status = "pending" (more questions)
// result1.completenessScore = 72 (up from 58)

// Answer 2
const result2 = await answerInvestigatorQuestion({
  sessionId: "a1b2c3d4-...",
  questionId: "q-124",
  answerText: "Dr. Williams was notified at 10:45 AM.",
  answeredBy: "user-admin-1",
  answeredByName: "Dr. Smith",
  method: "text"
})
// result2.status = "completed" (all gaps filled)
// result2.completenessScore = 95
```

---

## Gap Analysis

### Missing Field Detection

The system analyzes the narrative against Gold Standard fields:

```typescript
// analyze.ts
export async function analyzeNarrativeAndScore(narrative: string): Promise<{
  state: AgentState
  score: number
  completenessScore: number
  feedback: string
  filledFields: string[]
  missingFields: string[]
}>
```

### Field Categories

| Category | Fields |
|----------|--------|
| **Incident Basics** | resident_name, room_number, date_of_fall, time_of_fall, location_of_fall |
| **Narrative** | fall_witnessed, staff_narrative, resident_statement |
| **Resident State** | activity_at_time, footwear, clothing_issue, reported_symptoms_pre_fall |
| **Post-Fall Actions** | immediate_injuries_observed, head_impact_suspected, vitals_taken_post_fall, neuro_checks_initiated, physician_notified, family_notified, immediate_intervention_in_place |
| **Environment** | assistive_device_in_use, call_light_in_reach, was_care_plan_followed |
| **Subtype-Specific** | (varies by fall type) |

### Gap Question Generation

```typescript
// gap_questions.ts
export async function generateGapQuestions(
  state: AgentState,
  options: {
    responderName: string
    subtypeLabel?: string
    previousQuestions?: string[]
    lastAnswer?: string
    maxQuestions?: number
  }
): Promise<{
  questions: string[]
  missingFields: MissingFieldDescriptor[]
}>
```

**Process**:
1. Identify all missing fields from AgentState
2. Group related fields
3. Generate conversational questions
4. Exclude previously asked questions
5. Limit to maxQuestions (default 6)

---

## Scoring System

### Score Calculation

```typescript
Score = (FilledFieldsWeight / TotalFieldsWeight) × 100

Where:
- Critical fields (injuries, physician notification) = 2.0 weight
- Subtype-specific fields = 1.5 weight
- Standard fields = 1.0 weight
- Optional fields = 0.5 weight
```

### Score Interpretation

| Score Range | Interpretation |
|-------------|----------------|
| 90-100 | Excellent - Comprehensive documentation |
| 75-89 | Good - Minor gaps, acceptable |
| 60-74 | Adequate - Some important gaps |
| 40-59 | Needs Work - Significant gaps |
| 0-39 | Incomplete - Major information missing |

### Completeness Score

Simpler percentage:
```typescript
CompletenessScore = (FilledFields / TotalFields) × 100
```

### Feedback Generation

AI generates actionable feedback:

```
"Good initial report covering resident identity and fall location. 
Missing post-fall vital signs and physician notification status. 
Consider documenting whether neuro checks were initiated for head 
injury protocol compliance."
```

---

## Question Generation

### Dynamic Question Strategy

Questions are generated based on:
1. **Missing Fields**: What's not documented
2. **Subtype Context**: Fall-type specific questions
3. **Previous Answers**: Avoid repetition
4. **Conversation Flow**: Natural follow-ups

### Supplemental Questions

When AI-generated questions are insufficient:

```typescript
function supplementQuestions(
  baseQuestions: string[],
  missingFields: MissingFieldDescriptor[],
  minCount: number,
  maxCount = 6
): string[] {
  // If we have fewer than minCount questions,
  // generate generic questions from missing fields
  
  const topics = missingFields.map(f => f.label.toLowerCase())
  const question = `Could you walk me through ${topics.join(", ")}?`
  
  // Add until we reach minCount
}
```

### Question Types

| Type | Example |
|------|---------|
| **Direct** | "Were the wheelchair brakes locked?" |
| **Clarifying** | "You mentioned the brakes were unlocked. Can you confirm they weren't engaged before the fall?" |
| **Open-ended** | "Could you describe the resident's condition when you found them?" |
| **Follow-up** | "Based on the hip pain mentioned, were any imaging studies ordered?" |

---

## Finalization

### Completion Criteria

Investigation completes when:
1. All required fields have values, OR
2. No more questions can be generated, OR
3. Maximum question limit reached

### Finalization Process

```typescript
// finalize.ts
export async function finalizeInvestigation(input: {
  incidentId: string
  state: AgentState
  investigatorId: string
  investigatorName: string
  score: number
  completenessScore: number
  feedback: string
}): Promise<void> {
  // Update incident
  await updateIncident(incidentId, {
    investigation: {
      status: "completed",
      completedAt: new Date().toISOString(),
      investigatorId: input.investigatorId,
      investigatorName: input.investigatorName,
      goldStandard: state.global_standards,
      subTypeData: state.sub_type_data,
      score: input.score,
      completenessScore: input.completenessScore,
      feedback: input.feedback,
    }
  })
}
```

### Post-Finalization State

```json
{
  "investigation": {
    "status": "completed",
    "subtype": "fall-wheelchair",
    "startedAt": "2024-12-14T10:35:00.000Z",
    "completedAt": "2024-12-14T11:00:00.000Z",
    "investigatorId": "user-admin-1",
    "investigatorName": "Dr. Smith",
    "score": 92,
    "completenessScore": 88,
    "feedback": "Comprehensive investigation with excellent detail..."
  }
}
```

---

## Module Reference

### graph.ts

Main orchestrator with exported functions:

| Function | Purpose |
|----------|---------|
| `startInvestigatorConversation()` | Initialize investigation session |
| `answerInvestigatorQuestion()` | Process answer, generate next questions |

### analyze.ts

Narrative analysis and scoring:

| Function | Purpose |
|----------|---------|
| `analyzeNarrativeAndScore()` | Full analysis with AI |
| `extractFieldsFromNarrative()` | Parse narrative for field values |
| `calculateScore()` | Compute weighted score |

### gap_questions.ts

Question generation:

| Function | Purpose |
|----------|---------|
| `generateGapQuestions()` | AI-powered question generation |
| `collectMissingFields()` | Identify unfilled fields |
| `MissingFieldDescriptor` | Field metadata type |

### fill_gaps.ts

Answer processing:

| Function | Purpose |
|----------|---------|
| `fillGapsWithAnswer()` | Update state from answer |
| `parseAnswerForFields()` | Extract field values from text |

### session_store.ts

In-memory session management:

| Function | Purpose |
|----------|---------|
| `createSession()` | Create new session |
| `getSession()` | Retrieve session |
| `updateSession()` | Modify session |
| `deleteSession()` | Remove session |

### state_sync.ts

Database synchronization:

| Function | Purpose |
|----------|---------|
| `recordAnswerAndSync()` | Save answer to database |
| `syncStateToIncident()` | Update incident from state |

### finalize.ts

Investigation completion:

| Function | Purpose |
|----------|---------|
| `finalizeInvestigation()` | Mark complete, save final state |

---

## API Integration

### Endpoint

`POST /api/agent/report-conversational`

### Start Action

```json
{
  "action": "start",
  "incidentId": "inc-1734567890123",
  "narrative": "Optional override...",
  "investigatorId": "user-admin-1",
  "investigatorName": "Dr. Smith",
  "assignedStaffIds": ["user-1"],
  "reporterName": "Sarah Johnson"
}
```

### Answer Action

```json
{
  "action": "answer",
  "sessionId": "a1b2c3d4-...",
  "questionId": "q-1734567890123-0",
  "answerText": "Yes, vitals were taken.",
  "answeredBy": "user-admin-1",
  "answeredByName": "Dr. Smith",
  "method": "text"
}
```

### Request Validation

```typescript
function validateRequestBody(body: AgentRequestBody): { valid: boolean; error?: string } {
  if (body.action === "start") {
    if (!body.incidentId) return { valid: false, error: "incidentId is required" }
    if (!body.investigatorId) return { valid: false, error: "investigatorId is required" }
    if (!body.investigatorName) return { valid: false, error: "investigatorName is required" }
    if (!body.reporterName) return { valid: false, error: "reporterName is required" }
    return { valid: true }
  }

  // Answer validation
  if (!body.sessionId) return { valid: false, error: "sessionId is required" }
  if (!body.questionId) return { valid: false, error: "questionId is required" }
  if (!body.answerText) return { valid: false, error: "answerText is required" }
  if (!body.answeredBy) return { valid: false, error: "answeredBy is required" }
  if (!body.answeredByName) return { valid: false, error: "answeredByName is required" }

  return { valid: true }
}
```

---

## Usage Examples

### Complete Flow

```typescript
// 1. Start investigation
const startResult = await fetch('/api/agent/report-conversational', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'start',
    incidentId: 'inc-1734567890123',
    investigatorId: 'user-admin-1',
    investigatorName: 'Dr. Smith',
    reporterName: 'Sarah Johnson'
  })
}).then(r => r.json())

console.log(`Session: ${startResult.sessionId}`)
console.log(`Initial Score: ${startResult.score}`)
console.log(`Questions: ${startResult.questions.length}`)

// 2. Answer questions in a loop
let session = startResult
while (session.status !== 'completed' && session.questions?.length > 0) {
  const question = session.questions[0]
  const answer = await promptUser(question.text)
  
  session = await fetch('/api/agent/report-conversational', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'answer',
      sessionId: startResult.sessionId,
      questionId: question.id,
      answerText: answer,
      answeredBy: 'user-admin-1',
      answeredByName: 'Dr. Smith'
    })
  }).then(r => r.json())
  
  console.log(`Score: ${session.score} → ${session.completenessScore}%`)
}

console.log('Investigation complete!')
console.log(`Final Score: ${session.score}`)
```

### Frontend Integration

```tsx
function ExpertInvestigator({ incidentId, userId, userName }) {
  const [session, setSession] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [answer, setAnswer] = useState('')

  const startInvestigation = async () => {
    const result = await api.startConversation({
      incidentId,
      investigatorId: userId,
      investigatorName: userName,
      reporterName: incident.staffName
    })
    setSession(result)
    setCurrentQuestion(result.questions[0])
  }

  const submitAnswer = async () => {
    const result = await api.answerQuestion({
      sessionId: session.sessionId,
      questionId: currentQuestion.id,
      answerText: answer,
      answeredBy: userId,
      answeredByName: userName
    })
    
    setSession(result)
    setAnswer('')
    
    if (result.status === 'completed') {
      toast.success('Investigation complete!')
    } else {
      setCurrentQuestion(result.nextQuestions[0])
    }
  }

  return (
    <div>
      <ScoreDisplay score={session?.score} completeness={session?.completenessScore} />
      
      {currentQuestion && (
        <QuestionCard question={currentQuestion}>
          <Textarea value={answer} onChange={e => setAnswer(e.target.value)} />
          <Button onClick={submitAnswer}>Submit Answer</Button>
        </QuestionCard>
      )}
      
      <FeedbackPanel feedback={session?.feedback} />
    </div>
  )
}
```

---

## Error Handling

### Session Not Found

```typescript
const session = getSession(input.sessionId)
if (!session) {
  throw new Error(`Investigator session ${input.sessionId} not found`)
}
```

### Question Not in Session

```typescript
const pendingQuestion = session.pendingQuestions.find(q => q.id === input.questionId)
if (!pendingQuestion) {
  throw new Error(`Question ${input.questionId} is not active for this session`)
}
```

### AI Failures

Graceful degradation:
- If analysis fails, use basic scoring
- If question generation fails, use fallback questions
- If finalization fails, log error but preserve data

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| **Start Duration** | 3-8 seconds |
| **Answer Processing** | 2-5 seconds |
| **Total Investigation** | 5-30 minutes (user-dependent) |
| **Memory Usage** | ~10KB per session |
| **LLM Calls per Answer** | 1-2 |

---

## Related Documentation

- [04-AGENTIC-ARCHITECTURE.md](./04-AGENTIC-ARCHITECTURE.md) - System architecture
- [06-INVESTIGATION-AGENT.md](./06-INVESTIGATION-AGENT.md) - Automated investigation
- [09-GOLD-STANDARDS.md](./09-GOLD-STANDARDS.md) - Compliance field reference

---

*The Expert Investigator is the most interactive component of WAiK's agentic system, providing real-time feedback and guidance during compliance investigations.*

