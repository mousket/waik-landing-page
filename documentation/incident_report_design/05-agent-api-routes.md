## Agent API routes — current behavior

This doc summarizes what each agent-facing API route currently does.

For each route: **HTTP method(s)**, **inputs**, **outputs**, and **MongoDB/Redis operations**.

---

## `app/api/agent/report-conversational/route.ts`

### Method

- **POST**

### Purpose

Fronts the **expert investigator live conversation loop** implemented in `lib/agents/expert_investigator/graph.ts`.

Supports two actions:

- `action: "start"` — start a session and generate initial gap questions
- `action: "answer"` — persist an answer, update state, possibly generate next questions, and possibly finalize

### Accepts (JSON body)

Union body:

#### Start

```ts
{
  action: "start"
  incidentId: string
  narrative?: string
  initialNarrative?: string
  investigatorId: string
  investigatorName: string
  assignedStaffIds?: string[]
  reporterName: string
}
```

#### Answer

```ts
{
  action: "answer"
  sessionId: string
  questionId: string
  answerText: string
  answeredBy: string
  answeredByName: string
  method?: "text" | "voice"
  assignedStaffIds?: string[]
}
```

Auth requirement:

- Requires `getCurrentUser()`; returns `unauthorizedResponse()` if missing.
- Requires `user.facilityId` for `action: "start"`.

### Returns

On success (200):

- For `start`: returns the `startInvestigatorConversation(...)` result shape (sessionId, score, completeness, questions, missingFieldLabels, etc.)
- For `answer`: returns the `answerInvestigatorQuestion(...)` result shape:
  - `status: "pending" | "completed"`
  - updated fields, remaining missing labels, next questions, etc.

On partial timeout (still 200):

```ts
{
  status: "partial"
  sessionId: string | null
  incidentId: string
  questions: []
  message: string
}
```

On validation errors: `400 { error: string }`

On missing/expired session (answer): `404 { error: string }`

On server error: `500 { error: string }`

### Storage operations

**Redis**

- `getSession(sessionId)` to ensure session exists (answer action)
- The underlying expert investigator graph uses:
  - `createSession`, `updateSession`, `deleteSession` (Redis) as part of start/answer

**MongoDB**

Via expert investigator graph and state sync:

- `getIncidentById(...)` (read)
- `addQuestionToIncident(...)` (write embedded questions)
- `answerQuestion(...)` (write answer into embedded question)
- `updateIncident(...)` (write `investigation` completion payload when finalized)

Additional best-effort Mongo write on timeout:

- Calls `updateInvestigationProgressOnTimeout(incidentId, facilityId, completenessScore)` to persist progress if the route hits the internal timeout.

### Timeouts / runtime notes

- `maxDuration = 60`, internal `Promise.race` timeout set to **45s**.
- Runtime: `"nodejs"`, `dynamic = "force-dynamic"`.

---

## `app/api/agent/interview/start/route.ts`

### Method

- **POST**

### Purpose

Starts a **legacy/beta “interview work session”** stored in Redis (`InterviewWorkSession`).

This is distinct from the expert investigator session store.

### Accepts (JSON body)

Reads (no TS validation beyond basic checks):

- `residentName` (optional)
- `roomNumber` (optional)
- **`narrative` (required)** → 400 if missing
- `reportedById` (optional; default falls back to current user)
- `reportedByName` (optional)

Auth requirement:

- Requires `getCurrentUser()`.

### Returns

200 JSON:

```ts
{
  sessionId: string
  category: string
  categoryConfidence: number
  subtype: string | null
  completenessScore: number
  questions: Array<{
    id: string
    text: string
    phase: "initial" | "follow-up" | "final-critical"
    goldStandardField?: string
    isCritical: boolean
  }>
  reasoning: string
}
```

### Storage operations

**Redis**

- `createInterviewWorkSession(workSession)` writes `waik:interview-work:${sessionId}` with TTL 2h.

**LLM / fall analysis side effects**

- Calls `detectIncidentCategory(...)` (may call OpenAI via `category_detector.ts`)
- If fall + OpenAI configured:
  - `analyzeNarrativeAndScore(...)` (LLM)
  - `generateGapQuestions(...)` (LLM)

**MongoDB**

- None in this route.

---

## `app/api/agent/interview/answer/route.ts`

### Method

- **POST**

### Purpose

Accepts an answer for a given question within an **InterviewWorkSession** and recomputes a completeness score.

### Accepts (JSON body)

```ts
{
  sessionId?: string
  questionId: string
  answer: string
  narrative?: string
  previousAnswers?: Array<{
    questionId: string
    questionText?: string
    text: string
    answeredAt: string
    method?: "voice" | "text"
  }>
  category?: string
  subtype?: string | null
}
```

Validations:

- `questionId` and `answer` required → 400 otherwise
- If `sessionId` provided:
  - must exist in Redis → 404 otherwise
  - must belong to current user (`work.userId === user.userId`) → 403 otherwise

### Returns

200 JSON:

```ts
{
  success: true
  completenessScore: number
  updatedFields: string[]
  shouldComplete: boolean // completenessScore >= 70
}
```

### Storage operations

**Redis**

- `getInterviewWorkSession(sessionId)` (read)
- `updateInterviewWorkSession(sessionId, updater)` (write) to append/merge answer and update completeness/category/subtype.

**MongoDB**

- None in this route.

**LLM usage**

- If `categoryUsed === "fall"` and OpenAI configured:
  - recomputes by calling `analyzeNarrativeAndScore(combinedNarrative)` (LLM)
  - uses `analysisResult.filledFields` as `updatedFields`
- Else: uses a heuristic completeness formula.

---

## `app/api/agent/interview/complete/route.ts`

### Method

- **POST**

### Purpose

Finalizes the interview flow by creating a real **Incident** in MongoDB and seeding questions.

### Accepts (JSON body)

Loosely typed body; key fields used:

- `sessionId` (optional; if present, validates Redis session ownership)
- **`residentName` (required)**
- **`roomNumber` (required)**
- **`narrative` (required)**
- **`reportedById` (required)**
- `reportedByName` (optional)
- `reportedByRole` (optional; defaults to `"staff"`)
- `category` (optional)
- `subtype` (optional)
- `answers` (optional; array of `{ questionId, questionText?, text, answeredAt, method }`)
- `questions` (optional; array of `{ id, text, phase, goldStandardField?, isCritical }`)
- `completenessScore` (number; used to decide follow-up queueing)
- `initialReportCardScore` (optional; stored into incident investigation metadata)

Validations:

- If `sessionId` provided:
  - session must exist (Redis) and belong to current user → 404/403
- Requires `sessionUser.facilityId` → 400
- Requires the 4 required fields above → 400

### Returns

200 JSON:

```ts
{
  success: true
  incidentId: string
  completenessScore: number
  followUpQueued: boolean // completenessScore < 70
  initialQuestionsCount: number
  answersCount: number
}
```

### Storage operations

**Redis**

- If `sessionId` present: `getInterviewWorkSession(sessionId)` (read)
- If `sessionId` present: `deleteInterviewWorkSession(sessionId)` (delete)

**MongoDB**

1) Creates the incident:

- `createIncidentFromReport(...)` (Mongo create)
  - sets `initialReport.enhancedNarrative = aiSummary`

2) Generates and stores AI summary (LLM):

- `generateAISummary(...)` uses a *direct OpenAI SDK call* (not `generateChatCompletion`):
  - model hardcoded to `"gpt-4o-mini"`
  - temperature `0.3`
  - max_tokens `500`

3) Stores an “initial report card score” (if provided):

- dynamic import of `IncidentModel` then `IncidentModel.updateOne({id, facilityId}, {$set: ...})`
  - updates `investigation.score`, `investigation.completenessScore`, `investigation.subtype`, `investigation.status`, `updatedAt`

4) Saves initial interview questions and answers (if provided):

- `queueInvestigationQuestions(...)` to create embedded questions on the incident (phase `"initial"`)
- then `getIncidentById(...)` to find those embedded questions
- then `answerQuestion(...)` per question to attach answers

5) Follow-up generation (if completeness < 70):

- calls `generateFollowUpQuestionsAsync(...)` (fire-and-forget) which iterates `runInvestigationAgent(...)`
  - that agent updates incident metadata and queues follow-up questions via Mongo

6) Queues “final critical questions” (always):

- `queueInvestigationQuestions(...)` with phase `"final-critical"` and `generatedBy: "beta-interview-final-critical"`

---

## `app/api/agent/report/route.ts`

### Method

- **POST**

### Purpose

Streaming endpoint for the **Report Agent** (`lib/agents/report_agent.ts`).

### Accepts (JSON body)

Builds a `ReportAgentInput` from body:

- `residentName`
- `roomNumber` or `residentRoom`
- `narrative`
- `residentState` (optional)
- `environmentNotes` (optional)
- `reportedBy` or `reportedById`
- `reportedByName` (optional; default `"Unknown Reporter"`)
- `reportedByRole` or `role` (optional; default `"staff"`)

Auth requirement:

- Requires `getCurrentUser()`
- Requires `sessionUser.facilityId` → 400 otherwise

### Returns

Returns a **streaming** response as JSON Lines (`application/jsonl; charset=utf-8`).

- Each line is a JSON-encoded `ReportAgentEvent` emitted by `runReportAgent(agentInput)`.
- On error, the stream includes an `{"type":"error", ...}` line before closing.

### Storage operations

This route does not call Mongo/Redis directly; it delegates to `runReportAgent(...)`, which performs:

- Mongo create: `createIncidentFromReport(...)`
- Mongo read: `getUsers()`
- Mongo create: `createNotification(...)`
- Then it runs `runInvestigationAgent(...)` which:
  - Mongo read: `getIncidentById(...)`
  - Mongo update: `updateIncident(...)` to set investigation metadata
  - Mongo write: `queueInvestigationQuestions(...)`

---

## `app/api/agent/investigate/route.ts`

### Method

- **POST**

### Purpose

Streaming endpoint for the **Investigation Agent** (`lib/agents/investigation_agent.ts`).

### Accepts (JSON body)

```ts
{ incidentId: string }
```

Validations:

- Requires auth (`getCurrentUser()`).
- Requires `sessionUser.facilityId` → 400 if missing.
- Requires `incidentId` string → 400 if missing/invalid.

### Returns

Streaming JSON Lines (`application/jsonl; charset=utf-8`), emitting `InvestigationAgentEvent` objects line-by-line.

### Storage operations

This route does not touch Mongo/Redis directly; it delegates to `runInvestigationAgent(incidentId, facilityId)` which performs:

- Mongo read: `getIncidentById(incidentId, facilityId)`
- Mongo update: `updateIncident(...)` (sets `investigation.status`, `investigation.subtype`, timestamps)
- Mongo write: `queueInvestigationQuestions(...)`

