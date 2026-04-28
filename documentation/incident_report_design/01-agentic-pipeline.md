## Scope

This document maps the **incident reporting agentic pipeline** as implemented today, with:

- **Exported APIs** (functions + signatures)
- **LLM calls** (model, temperature, system prompt summary)
- **Storage IO** (MongoDB, Redis, in-memory)
- **Connectivity** (what calls what)

The pipeline currently has **two** “investigation” paths:

1. `lib/agents/investigation_agent.ts` — subtype classification + follow-up question queueing (static templates + optional LLM tailoring)
2. `lib/agents/expert_investigator/*` — a **live**, session-based, gap-filling loop that produces/answers follow-ups and persists a structured “Gold Standard” record into the incident.

---

## Directory inventory

### `lib/agents/`

- `assessment_agent.ts`
- `assessment_session_store.ts`
- `category_detector.ts`
- `expert_investigator/`
- `incident-analyzer.ts`
- `intelligence-qa.ts`
- `intelligence-tools.ts`
- `investigation_agent.ts`
- `report_agent.ts`

### `lib/agents/expert_investigator/`

- `analyze.ts`
- `fill_gaps.ts`
- `finalize.ts`
- `gap_questions.ts`
- `graph.ts`
- `session_store.ts`
- `state_sync.ts`

---

## Shared LLM wrapper (applies everywhere)

All LLM calls route through `lib/openai.ts`:

- **Model**: `process.env.OPENAI_LLM_MODEL || "gpt-4o-mini"`
- **Temperature default**: `0.7` (most callsites override)
- **Max tokens default**: `2000` (most callsites override)

---

## Pipeline A — initial report creation (`lib/agents/report_agent.ts`)

### Exported function

- `runReportAgent(input: ReportAgentInput): AsyncGenerator<ReportAgentEvent>`

### LLM calls

`runReportAgent` optionally calls internal `generateEnhancedNarrative(...)`:

- **Model**: default (`OPENAI_LLM_MODEL` or `"gpt-4o-mini"`)
- **Temperature**: `0.2`
- **System prompt summary**: clinical documentation assistant; rewrite staff notes into concise professional summary; highlight condition/events/injuries/environment; avoid speculation/new facts; return text w/o markdown.

### Storage IO

MongoDB (via `lib/db.ts`):

- **Write**: `createIncidentFromReport(...)` (creates the Incident + seeds “voice-report” Q/A entries)
- **Read**: `getUsers()` (to find admins)
- **Write**: `createNotification(...)` (one per admin)

### Connectivity (call graph)

`runReportAgent(...)` → `createIncidentFromReport(...)` → (notifications) → **handoff**:

- `for await (const event of runInvestigationAgent(incident.id, facilityId)) { ... }`

---

## Pipeline B — investigation seeding (`lib/agents/investigation_agent.ts`)

### Exported function

- `runInvestigationAgent(incidentId: string, facilityId: string): AsyncGenerator<InvestigationAgentEvent>`

### LLM calls

1) `classifyIncidentSubtype(incident)`
- **Model**: default
- **Temperature**: `0`
- **System prompt summary**: “Return only the classification label.”
- Output label must match one of:
  - `fall-wheelchair`, `fall-bed`, `fall-slip`, `fall-lift`, `fall-unknown`

2) `generateExpertQuestions(incident, subtype, templates)`
- **Model**: default
- **Temperature**: `0.3`
- **System prompt summary**: “Return only the list of questions.”

### Storage IO

MongoDB (via `lib/db.ts`):

- **Read**: `getIncidentById(...)`
- **Write**: `updateIncident(...)` to set `investigation.status = "in-progress"` and `investigation.subtype = <classified>`
- **Write**: `queueInvestigationQuestions(...)` to push generated questions onto the incident record

### Connectivity (call graph)

`runInvestigationAgent(...)`

- `getIncidentById(...)`
- `classifyIncidentSubtype(...)` (LLM if configured, else fallback)
- `updateIncident(...)`
- `generateExpertQuestions(...)` (LLM if configured, else templates)
- `queueInvestigationQuestions(...)`

---

## Pipeline C — live “Expert Investigator” loop (`lib/agents/expert_investigator/*`)

This is a **sessioned** interactive flow:

- Session state is stored in **Redis** (`session_store.ts`)
- Incident Q/A are stored in **MongoDB** (embedded under Incident `questions[]`)
- Structured “Gold Standard” completion is written into Incident `investigation.goldStandard` and `investigation.subTypeData` (Mongo `Mixed`).

### “Graph” entrypoints (note: not LangGraph)

`lib/agents/expert_investigator/graph.ts` is not a LangGraph `StateGraph`; it’s a manual orchestration module exporting:

- `startInvestigatorConversation(input: StartConversationInput): Promise<StartConversationResult>`
- `answerInvestigatorQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionResult>`

### LLM calls (indirect, via invoked modules)

`startInvestigatorConversation(...)` calls:

- `analyzeNarrativeAndScore(...)` (LLM temperature `0`, tool/function-call style response parsing in that module)
- `generateGapQuestions(...)` (LLM temperature `0.4`)

`answerInvestigatorQuestion(...)` calls:

- `fillGapsWithAnswer(...)` (LLM temperature `0` with tool calls)
- `generateGapQuestions(...)` again for subsequent questions when missing fields remain

### Storage IO

MongoDB (via `lib/db.ts`):

- **Read**: `getIncidentById(...)`
- **Write**: `addQuestionToIncident(...)` (persist follow-up questions)
- **Write**: `answerQuestion(...)` (persist answers)
- **Write**: `updateIncident(...)` (finalize into `investigation.*`)

Redis:

- **Write**: `createSession(...)`
- **Read**: `getSession(...)`
- **Write**: `updateSession(...)`
- **Delete**: `deleteSession(...)`

In-memory:

- Dedupe sets/maps, question supplementation, and “state” mutation before persistence.

### Connectivity (call graph)

#### `startInvestigatorConversation(...)`

- `getIncidentById(...)`
- `analyzeNarrativeAndScore(narrative)` → returns `state: AgentState` + scoring metadata
- `generateGapQuestions(state, ...)` → returns `questions[]` + `missingFields[]`
- `upsertQuestionsForIncident(...)`
  - reads existing incident questions
  - writes new questions via `addQuestionToIncident(...)`
- create `InvestigatorSession` object and persist via `createSession(...)` (Redis)

#### `answerInvestigatorQuestion(...)`

- `getSession(...)` (Redis)
- `recordAnswerAndSync(...)` (Mongo: `answerQuestion(...)`)
- `fillGapsWithAnswer(...)` → returns updated `state` + `updatedFields` + `remainingMissing`

Branch:

- If `remainingMissing.length > 0`:
  - `generateGapQuestions(...)` → next questions
  - `upsertQuestionsForIncident(...)` → add to incident (Mongo)
  - `updateSession(...)` (Redis)
  - return `{ status: "pending", nextQuestions: [...] }`

- Else:
  - `updateSession(...)` (Redis)
  - `finalizeInvestigation(...)` (Mongo: `updateIncident(...)`)
  - `deleteSession(...)` (Redis)
  - return `{ status: "completed" }`

