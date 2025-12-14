# WAiK Investigation Agent (Agent 2)

**Version**: 1.0  
**Last Updated**: December 2024  
**File**: `lib/agents/investigation_agent.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Purpose & Design](#purpose--design)
3. [Input & Output](#input--output)
4. [Agent Flow](#agent-flow)
5. [Node Descriptions](#node-descriptions)
6. [Subtype Classification](#subtype-classification)
7. [Question Templates](#question-templates)
8. [Question Generation](#question-generation)
9. [Deduplication](#deduplication)
10. [Event Types](#event-types)
11. [Usage Examples](#usage-examples)

---

## Overview

The **Investigation Agent** (also called "Agent 2" or "The Investigator") is the asynchronous, background agent that analyzes incident reports and generates expert follow-up questions. It runs automatically after the Report Agent creates an incident.

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Mode** | Asynchronous, background |
| **Trigger** | Called by Report Agent after incident creation |
| **Duration** | 5-15 seconds |
| **Input** | Incident ID |
| **Output** | Subtype classification + 6-8 expert questions |
| **User** | None (runs automatically) |

---

## Purpose & Design

### What It Does

1. **Loads incident data** — fetches the newly created incident
2. **Classifies subtype** — determines fall type (wheelchair, bed, slip, lift, unknown)
3. **Selects expert templates** — loads subtype-specific question templates
4. **Generates tailored questions** — uses AI to customize questions for the narrative
5. **Deduplicates** — removes questions that overlap with existing ones
6. **Queues questions** — saves questions to the incident for staff to answer

### What It Doesn't Do

- ❌ Interact with users (it's fully automatic)
- ❌ Wait for answers (questions are answered later)
- ❌ Score the report (that's the Expert Investigator's job)
- ❌ Generate final reports (that's the Incident Analyzer's job)

### Design Philosophy

> "Be the expert risk manager that analyzes every incident and asks the right questions."

The Investigation Agent acts like a senior risk manager who:
- Reads the initial report
- Immediately knows what type of fall this is
- Knows exactly which questions to ask based on the fall type
- Queues those questions for the nurse to answer on their break

---

## Input & Output

### Input

The agent takes a single input: the incident ID.

```typescript
export async function* runInvestigationAgent(incidentId: string): AsyncGenerator<InvestigationAgentEvent>
```

### Output Events

```typescript
type InvestigationAgentEvent =
  | { type: "log"; node: string; message: string }
  | { type: "classification"; node: "classify_subtype"; subtype: string }
  | { type: "questions_generated"; node: "queue_questions"; count: number }
  | { type: "error"; node: string; error: string }
  | { type: "complete"; node: "queue_questions"; incidentId: string }
```

### Database Changes

After running, the incident has:
- `investigation.status`: `"in-progress"`
- `investigation.subtype`: e.g., `"fall-wheelchair"`
- `investigation.startedAt`: timestamp
- `questions[]`: 6-8 new AI-generated questions with `source: "ai-generated"`

---

## Agent Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INVESTIGATION AGENT FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    1. LOAD_AND_ANALYZE                              │   │
│   │                                                                     │   │
│   │   • Receive incidentId from Report Agent                            │   │
│   │   • Fetch incident from database                                    │   │
│   │   • Validate incident exists                                        │   │
│   │   • Emit: { type: "log", message: "Loading incident data" }         │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    2. CLASSIFY_SUBTYPE                              │   │
│   │                    (AI-Powered)                                     │   │
│   │                                                                     │   │
│   │   • Extract narrative, resident state, environment notes            │   │
│   │   • Send to LLM for classification                                  │   │
│   │   • Determine: fall-wheelchair | fall-bed | fall-slip |             │   │
│   │                 fall-lift | fall-unknown                            │   │
│   │   • Update incident.investigation.subtype                           │   │
│   │   • Emit: { type: "classification", subtype: "fall-wheelchair" }    │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    3. CONDITIONAL_ROUTER                            │   │
│   │                                                                     │   │
│   │   • Load question templates based on subtype                        │   │
│   │   • fall-wheelchair → wheelchair templates (8 questions)            │   │
│   │   • fall-bed → bed templates (8 questions)                          │   │
│   │   • fall-slip → slip templates (8 questions)                        │   │
│   │   • fall-lift → lift templates (8 questions)                        │   │
│   │   • fall-unknown → generic templates (8 questions)                  │   │
│   │   • Emit: { type: "log", message: "Routing to X expert..." }        │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                 4. EXPERT_QUESTION_GENERATOR                        │   │
│   │                 (AI-Powered)                                        │   │
│   │                                                                     │   │
│   │   • Take narrative + expert templates                               │   │
│   │   • Send to LLM to generate tailored questions                      │   │
│   │   • Questions are specific to this incident's details               │   │
│   │   • Generate 6-8 questions                                          │   │
│   │   • If LLM fails, fall back to raw templates                        │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                  5. DE_DUPLICATE_QUESTIONS                          │   │
│   │                                                                     │   │
│   │   • Check existing questions on incident                            │   │
│   │   • Remove any that duplicate existing questions                    │   │
│   │   • Remove duplicates within the generated set                      │   │
│   │   • Case-insensitive comparison                                     │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    6. QUEUE_QUESTIONS                               │   │
│   │                                                                     │   │
│   │   • Save questions to incident.questions[]                          │   │
│   │   • Set source: "ai-generated"                                      │   │
│   │   • Set generatedBy: "investigation-agent"                          │   │
│   │   • Assign to original reporter (staffId)                           │   │
│   │   • Auto-vectorize for RAG (background)                             │   │
│   │   • Emit: { type: "questions_generated", count: 6 }                 │   │
│   │   • Emit: { type: "complete", incidentId: "..." }                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Node Descriptions

### Node 1: load_and_analyze

**Purpose**: Fetch the incident from the database.

```typescript
const incident = await getIncidentById(incidentId)

if (!incident) {
  yield {
    type: "error",
    node: "load_and_analyze",
    error: `Incident ${incidentId} not found`,
  }
  return
}
```

**Emits**: `{ type: "log", node: "load_and_analyze", message: "Incident loaded for resident Margaret Chen" }`

---

### Node 2: classify_subtype

**Purpose**: Determine the fall subtype using AI.

**Process**:
1. Build a prompt with incident details
2. Send to LLM with strict output format
3. Parse response to get subtype
4. Update incident in database

**LLM Prompt**:
```
You are a clinical risk analyst who classifies fall incidents.
Return ONLY one of the following labels:
fall-wheelchair, fall-bed, fall-slip, fall-lift, fall-unknown

Incident Details:
Resident: Margaret Chen
Room: 204A
Initial Narrative: Found resident on floor next to wheelchair...
Resident State: Alert, complaining of hip pain
Environment Notes: Wheelchair nearby, brakes not locked

Pick the label that best matches the scenario. If unsure, respond with fall-unknown.
```

**Classification Logic**:
```typescript
const SUBTYPE_OPTIONS = [
  "fall-wheelchair",
  "fall-bed",
  "fall-slip",
  "fall-lift",
  "fall-unknown",
] as const

const raw = response.choices?.[0]?.message?.content?.trim().toLowerCase()
const match = SUBTYPE_OPTIONS.find((option) => raw.includes(option))
return match || "fall-unknown"
```

**Database Update**:
```typescript
await updateIncident(incident.id, {
  investigation: {
    status: "in-progress",
    subtype,
    startedAt: incident.investigation?.startedAt ?? now,
  },
})
```

**Emits**: `{ type: "classification", node: "classify_subtype", subtype: "fall-wheelchair" }`

---

### Node 3: conditional_router

**Purpose**: Select the appropriate question templates based on subtype.

```typescript
const templates = INVESTIGATION_TEMPLATES[subtype] || INVESTIGATION_TEMPLATES["fall-unknown"]
```

**Emits**: `{ type: "log", node: "conditional_router", message: "Routing to fall-wheelchair expert question generator" }`

---

### Node 4: expert_question_generator

**Purpose**: Generate tailored questions using AI.

**LLM Prompt**:
```
You are assisting in a fall investigation at a care facility. Using the 
provided incident context and expert template prompts, generate a concise 
list of follow-up questions that staff should answer.

Incident Narrative: Found resident on floor next to wheelchair...
Resident State: Alert, complaining of hip pain
Environment Notes: Wheelchair nearby, brakes not locked
Subtype: fall-wheelchair

Expert Template Questions:
- Were the wheelchair brakes engaged prior to the transfer attempt?
- Was the resident using any safety belt or lap buddy when seated?
- Has the wheelchair been inspected for maintenance issues recently?
[... more templates ...]

Guidelines:
- Use professional, direct language
- Tailor the questions using the narrative when possible
- Focus on actionable information needed to understand causes
- Provide 6-8 questions maximum
- Do not repeat existing questions verbatim
```

**Fallback**: If LLM fails, return raw templates:

```typescript
try {
  const response = await generateChatCompletion([...], { temperature: 0.3 })
  // Parse and return generated questions
} catch (error) {
  console.warn("[Investigation Agent] Failed to generate expert questions", error)
  return templates  // Return raw templates as fallback
}
```

---

### Node 5: de_duplicate_questions

**Purpose**: Remove duplicate questions.

```typescript
function dedupeQuestions(incident: Incident, questions: string[]): string[] {
  // Get existing questions (lowercased)
  const existing = new Set(
    incident.questions.map((q) => q.questionText.trim().toLowerCase())
  )

  const deduped: string[] = []
  const seen = new Set<string>()

  questions.forEach((question) => {
    const normalized = question.trim()
    if (!normalized) return
    
    const key = normalized.toLowerCase()
    
    // Skip if already exists on incident
    if (existing.has(key)) return
    
    // Skip if duplicate within this batch
    if (seen.has(key)) return
    
    seen.add(key)
    deduped.push(normalized)
  })

  return deduped
}
```

---

### Node 6: queue_questions

**Purpose**: Save questions to the database.

```typescript
await queueInvestigationQuestions({
  incidentId: incident.id,
  questions: dedupedQuestions.map((questionText) => ({
    questionText,
    assignedTo: incident.staffId ? [incident.staffId] : undefined,
  })),
  generatedBy: "investigation-agent",
})
```

**Question Structure Created**:
```json
{
  "id": "q-1734567890123-0",
  "incidentId": "inc-1734567890123",
  "questionText": "Were the wheelchair brakes engaged prior to the transfer attempt?",
  "askedBy": "investigation-agent",
  "askedAt": "2024-12-14T10:35:00.000Z",
  "assignedTo": ["user-1"],
  "source": "ai-generated",
  "generatedBy": "investigation-agent",
  "metadata": {
    "reporterId": "user-1",
    "reporterName": "Sarah Johnson, RN",
    "reporterRole": "staff",
    "assignedStaffIds": ["user-1"],
    "createdVia": "system"
  }
}
```

**Emits**: 
- `{ type: "questions_generated", node: "queue_questions", count: 6 }`
- `{ type: "complete", node: "queue_questions", incidentId: "inc-..." }`

---

## Subtype Classification

### Classification Decision Tree

```
Narrative Analysis
       │
       ├── Contains "wheelchair", "chair", "brakes", "wheel" ?
       │   └── YES → fall-wheelchair
       │
       ├── Contains "bed", "mattress", "rails", "side rail" ?
       │   └── YES → fall-bed
       │
       ├── Contains "slip", "wet", "spill", "floor", "trip" ?
       │   └── YES → fall-slip
       │
       ├── Contains "lift", "hoyer", "transfer", "sling" ?
       │   └── YES → fall-lift
       │
       └── No clear indicators
           └── fall-unknown
```

### LLM Enhancement

The LLM adds contextual understanding:
- "Found next to wheelchair with brakes unlocked" → `fall-wheelchair`
- "Slipped getting out of shower" → `fall-slip`
- "Fell during Hoyer lift transfer" → `fall-lift`

---

## Question Templates

### fall-wheelchair Templates

```typescript
"fall-wheelchair": [
  "Were the wheelchair brakes engaged prior to the transfer attempt?",
  "Was the resident using any safety belt or lap buddy when seated?",
  "Has the wheelchair been inspected for maintenance issues recently?",
  "Was the cushion positioned correctly before the incident?",
  "Did the resident report discomfort or stiffness in the chair during earlier checks?",
  "Who assisted the resident with transfers earlier in the day?",
  "Was the footrest raised or removed before the resident tried to stand?",
  "Has physical therapy evaluated the resident's wheelchair fit in the last 30 days?",
]
```

### fall-bed Templates

```typescript
"fall-bed": [
  "Was the bed in a lowered position when the fall occurred?",
  "Were side rails used or available for this resident?",
  "What assistive devices were near the bedside at the time of the fall?",
  "Did the resident attempt to exit the bed without calling for assistance?",
  "Were bed alarms or motion sensors active?",
  "Has the resident expressed difficulty with transfers from bed recently?",
  "Was there adequate lighting in the resident's room during the incident?",
  "Were non-slip socks or footwear in place before the fall?",
]
```

### fall-slip Templates

```typescript
"fall-slip": [
  "What was the surface condition where the resident slipped (wet, cluttered, uneven)?",
  "Was appropriate footwear being worn by the resident?",
  "Were grab bars or handrails available within reach?",
  "Did housekeeping recently service the area where the fall occurred?",
  "Was there adequate lighting in the area at the time?",
  "Was the resident carrying any objects that may have impacted balance?",
  "Have there been prior slip incidents in this location?",
  "Did the resident receive gait assistance or supervision during ambulation?",
]
```

### fall-lift Templates

```typescript
"fall-lift": [
  "What type of lift or transfer aid was used during the incident?",
  "Was a second staff member present during the transfer?",
  "Were lift slings inspected before the transfer?",
  "Did the resident express discomfort or fear during transfers recently?",
  "Was staff trained on the specific lift equipment involved?",
  "Were lift weight limits or safety indicators exceeded?",
  "Was the resident's care plan followed for transfers?",
  "Were there any equipment malfunctions noted during or after the transfer?",
]
```

### fall-unknown Templates

```typescript
"fall-unknown": [
  "Where exactly did the incident occur and what was the resident attempting to do?",
  "Was the resident alone or supervised at the time?",
  "Were there any environmental hazards present (clutter, spills, poor lighting)?",
  "Has the resident reported dizziness, weakness, or other symptoms recently?",
  "Were prescribed mobility aids within reach and in good condition?",
  "Have there been recent medication changes that might impact balance?",
  "Has the resident had previous falls or near misses in the past 30 days?",
  "Was the resident wearing appropriate footwear?",
]
```

---

## Question Generation

### AI Generation Process

1. **Input**: Narrative + Templates
2. **Context**: LLM understands the specific incident
3. **Tailoring**: Questions are customized to mention relevant details
4. **Output**: 6-8 professional, targeted questions

### Example Transformation

**Template**:
> "Were the wheelchair brakes engaged prior to the transfer attempt?"

**AI-Generated** (for narrative mentioning brakes were unlocked):
> "You mentioned the wheelchair brakes were not engaged when you found the resident. Can you confirm whether the brakes were locked before the resident attempted to stand?"

---

## Deduplication

### Why It's Needed

1. **Voice report seeds questions**: Initial report may already have Q&A
2. **Admin manual questions**: Admin may have added questions before agent runs
3. **Repeat runs**: Agent might run again on the same incident

### Deduplication Logic

```typescript
function dedupeQuestions(incident: Incident, questions: string[]): string[] {
  const existing = new Set(
    incident.questions.map((q) => q.questionText.trim().toLowerCase())
  )

  const deduped: string[] = []
  const seen = new Set<string>()

  questions.forEach((question) => {
    const key = question.trim().toLowerCase()
    
    if (existing.has(key)) return   // Skip existing
    if (seen.has(key)) return       // Skip duplicates in batch
    
    seen.add(key)
    deduped.push(question.trim())
  })

  return deduped
}
```

---

## Event Types

### Log Events

```json
{
  "type": "log",
  "node": "load_and_analyze",
  "message": "Loading incident data"
}
```

### Classification Event

```json
{
  "type": "classification",
  "node": "classify_subtype",
  "subtype": "fall-wheelchair"
}
```

### Questions Generated Event

```json
{
  "type": "questions_generated",
  "node": "queue_questions",
  "count": 6
}
```

### Complete Event

```json
{
  "type": "complete",
  "node": "queue_questions",
  "incidentId": "inc-1734567890123"
}
```

### Error Event

```json
{
  "type": "error",
  "node": "classify_subtype",
  "error": "OpenAI rate limit exceeded"
}
```

---

## Usage Examples

### Direct API Call

```bash
curl -X POST http://localhost:3000/api/agent/investigate \
  -H "Content-Type: application/json" \
  -d '{"incidentId": "inc-1734567890123"}'
```

### Programmatic Usage

```typescript
import { runInvestigationAgent } from "@/lib/agents/investigation_agent"

for await (const event of runInvestigationAgent("inc-1734567890123")) {
  switch (event.type) {
    case "classification":
      console.log(`Classified as: ${event.subtype}`)
      break
    case "questions_generated":
      console.log(`Generated ${event.count} questions`)
      break
    case "complete":
      console.log("Investigation complete")
      break
    case "error":
      console.error(`Error in ${event.node}: ${event.error}`)
      break
  }
}
```

### Response Stream

```
{"type":"log","node":"load_and_analyze","message":"Loading incident data"}
{"type":"log","node":"load_and_analyze","message":"Incident loaded for resident Margaret Chen"}
{"type":"classification","node":"classify_subtype","subtype":"fall-wheelchair"}
{"type":"log","node":"conditional_router","message":"Routing to fall-wheelchair expert question generator"}
{"type":"log","node":"queue_questions","message":"Queueing 6 follow-up questions for staff"}
{"type":"questions_generated","node":"queue_questions","count":6}
{"type":"complete","node":"queue_questions","incidentId":"inc-1734567890123"}
```

---

## Error Handling

### Incident Not Found

```typescript
if (!incident) {
  yield {
    type: "error",
    node: "load_and_analyze",
    error: `Incident ${incidentId} not found`,
  }
  return  // Exit early
}
```

### Classification Failure

Falls back to existing subtype or "fall-unknown":

```typescript
try {
  // LLM classification
} catch (error) {
  console.warn("[Investigation Agent] Failed to classify subtype", error)
  return incident.investigation?.subtype || "fall-unknown"
}
```

### Question Generation Failure

Falls back to raw templates:

```typescript
try {
  // LLM generation
} catch (error) {
  console.warn("[Investigation Agent] Failed to generate expert questions", error)
  return templates  // Use raw templates
}
```

### No Questions Generated

Completes without error:

```typescript
if (generatedQuestions.length === 0) {
  yield {
    type: "error",
    node: "expert_question_generator",
    error: "No follow-up questions generated",
  }
  yield { type: "complete", node: "queue_questions", incidentId: incident.id }
  return
}
```

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| **Total Duration** | 5-15 seconds |
| **LLM Calls** | 2 (classification + generation) |
| **Token Usage** | ~500-800 tokens per run |
| **Cost** | ~$0.0004 per incident |

---

## Related Documentation

- [04-AGENTIC-ARCHITECTURE.md](./04-AGENTIC-ARCHITECTURE.md) - System architecture
- [05-REPORT-AGENT.md](./05-REPORT-AGENT.md) - Report Agent (triggers this agent)
- [07-EXPERT-INVESTIGATOR.md](./07-EXPERT-INVESTIGATOR.md) - Expert Investigator (handles answers)
- [09-GOLD-STANDARDS.md](./09-GOLD-STANDARDS.md) - Compliance standards

---

*The Investigation Agent is the "expert brain" that transforms simple narratives into comprehensive compliance investigations.*

