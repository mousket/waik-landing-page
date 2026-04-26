# WAiK Agentic Architecture

**Version**: 1.0  
**Last Updated**: December 2024  
**Status**: Production Implementation

---

## Table of Contents

1. [Introduction](#introduction)
2. [The Problem with Traditional Reporting](#the-problem-with-traditional-reporting)
3. [The Two-Agent Solution](#the-two-agent-solution)
4. [Architecture Overview](#architecture-overview)
5. [Agent Communication](#agent-communication)
6. [The Handoff Pattern](#the-handoff-pattern)
7. [State Management](#state-management)
8. [Gold Standards Integration](#gold-standards-integration)
9. [Implementation Files](#implementation-files)

---

## Introduction

WAiK's intelligence is powered by a **Two-Agent Agentic System** built on LangChain.js. This architecture separates the time-critical "at-the-scene" reporting from the thorough "investigation" analysis, allowing staff to return to patient care quickly while the system does expert-level work in the background.

### Design Philosophy

> "The nurse's burden is 5 minutes, but the system does 2 hours of expert-level investigative work for them in the background."

This philosophy drives every architectural decision:
- **Minimize staff time** at the point of incident
- **Maximize data capture** through intelligent follow-up
- **Automate expert analysis** that would normally require a risk manager
- **Ensure compliance** with regulatory requirements

---

## The Problem with Traditional Reporting

### Traditional Incident Reporting Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRADITIONAL INCIDENT REPORTING                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │   INCIDENT  │                                                           │
│   │   OCCURS    │                                                           │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    STAFF MEMBER AT SCENE                            │   │
│   │                                                                     │   │
│   │   Must handle BOTH:                                                 │   │
│   │   ├── 🏥 Resident care (priority)                                   │   │
│   │   └── 📝 Complete documentation (45-60 minutes)                     │   │
│   │                                                                     │   │
│   │   Problems:                                                         │   │
│   │   ├── ⏰ Time pressure leads to incomplete reports                  │   │
│   │   ├── 🧠 Memory fades - details lost                                │   │
│   │   ├── 📋 Generic forms miss context-specific questions              │   │
│   │   └── 😓 Staff burnout from documentation burden                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐                                                           │
│   │  INCOMPLETE │──────────────────────────────────────────► Compliance    │
│   │   REPORT    │                                            Issues        │
│   └─────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Pain Points

| Issue | Impact |
|-------|--------|
| **Time at scene** | 45-60 minutes diverted from patient care |
| **Generic forms** | Same questions for wheelchair falls and bed falls |
| **Memory decay** | Critical details forgotten hours later |
| **Staff burnout** | Documentation is #1 complaint in nursing |
| **Incomplete data** | 40-60% of compliance fields left empty |
| **Delayed reporting** | Reports filed hours/days after incident |

---

## The Two-Agent Solution

WAiK solves this with a **Two-Agent Handoff Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WAIK TWO-AGENT ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │   INCIDENT  │                                                           │
│   │   OCCURS    │                                                           │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     AGENT 1: "THE REPORTER"                         │   │
│   │                     ─────────────────────────                       │   │
│   │   📱 Live, at-the-scene                                             │   │
│   │   🎤 Voice-enabled                                                  │   │
│   │   ⏱️  5 minutes maximum                                             │   │
│   │                                                                     │   │
│   │   Captures ONLY:                                                    │   │
│   │   ├── Who (resident name, room)                                     │   │
│   │   ├── What (narrative description)                                  │   │
│   │   ├── Resident state (injuries, alertness)                          │   │
│   │   └── Environment (room conditions)                                 │   │
│   │                                                                     │   │
│   │   Output: Initial incident record + admin notification              │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                          HANDOFF │ (async trigger)                          │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    AGENT 2: "THE INVESTIGATOR"                      │   │
│   │                    ──────────────────────────────                   │   │
│   │   🔍 Asynchronous, background                                       │   │
│   │   🧠 Expert analysis                                                │   │
│   │   📊 Compliance-driven                                              │   │
│   │                                                                     │   │
│   │   Automatically:                                                    │   │
│   │   ├── Classifies incident subtype (wheelchair, bed, slip, etc.)    │   │
│   │   ├── Identifies gaps in the narrative                              │   │
│   │   ├── Generates expert follow-up questions                          │   │
│   │   └── Queues questions for staff to answer later                    │   │
│   │                                                                     │   │
│   │   Output: Subtype + 6-8 targeted follow-up questions                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      STAFF ANSWERS LATER                            │   │
│   │                      ───────────────────                            │   │
│   │   ☕ On break or when convenient                                    │   │
│   │   📝 Via incident detail page                                       │   │
│   │   🎤 Text or voice                                                  │   │
│   │                                                                     │   │
│   │   Expert Investigator (optional):                                   │   │
│   │   ├── Conversational gap-filling                                    │   │
│   │   ├── Real-time scoring                                             │   │
│   │   └── Dynamic question generation                                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      COMPLETE REPORT                                │   │
│   │                      ───────────────                                │   │
│   │   ✅ 90%+ compliance fields filled                                  │   │
│   │   ✅ Expert-level detail                                            │   │
│   │   ✅ Staff time: ~10 minutes total                                  │   │
│   │   ✅ AI-generated insights available                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Benefits of Two-Agent Architecture

| Aspect | Traditional | WAiK Two-Agent |
|--------|-------------|----------------|
| **Time at scene** | 45-60 minutes | 5 minutes |
| **Question quality** | Generic checklist | Context-specific expert questions |
| **Subtype handling** | Same form for all | Specialized questions per subtype |
| **Gap identification** | Manual review | Automatic AI analysis |
| **Staff experience** | Burdensome | Natural conversation |
| **Compliance rate** | 40-60% | 90%+ |

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENTIC SYSTEM LAYERS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        PRESENTATION LAYER                           │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│   │   │  Standard   │  │  Companion  │  │Conversational│                │   │
│   │   │   Create    │  │    Mode     │  │    Mode     │                 │   │
│   │   │   (forms)   │  │  (guided)   │  │ (voice AI)  │                 │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           API LAYER                                 │   │
│   │   ┌───────────────────┐  ┌───────────────────┐                      │   │
│   │   │ POST /api/agent/  │  │ POST /api/agent/  │                      │   │
│   │   │     report        │  │   investigate     │                      │   │
│   │   └───────────────────┘  └───────────────────┘                      │   │
│   │   ┌─────────────────────────────────────────┐                       │   │
│   │   │ POST /api/agent/report-conversational   │                       │   │
│   │   └─────────────────────────────────────────┘                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         AGENT LAYER                                 │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                    REPORT AGENT                             │   │   │
│   │   │                 (report_agent.ts)                           │   │   │
│   │   │                                                             │   │   │
│   │   │   Nodes:                                                    │   │   │
│   │   │   ├── start_report                                          │   │   │
│   │   │   ├── capture_narrative                                     │   │   │
│   │   │   ├── enhance_narrative (AI)                                │   │   │
│   │   │   ├── create_incident_and_handoff                           │   │   │
│   │   │   └── node_exit_message                                     │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                              │                                      │   │
│   │                      triggers│                                      │   │
│   │                              ▼                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                 INVESTIGATION AGENT                         │   │   │
│   │   │              (investigation_agent.ts)                       │   │   │
│   │   │                                                             │   │   │
│   │   │   Nodes:                                                    │   │   │
│   │   │   ├── load_and_analyze                                      │   │   │
│   │   │   ├── classify_subtype (AI)                                 │   │   │
│   │   │   ├── conditional_router                                    │   │   │
│   │   │   ├── expert_question_generator (AI)                        │   │   │
│   │   │   ├── de_duplicate_questions                                │   │   │
│   │   │   └── queue_questions                                       │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │               EXPERT INVESTIGATOR                           │   │   │
│   │   │           (expert_investigator/graph.ts)                    │   │   │
│   │   │                                                             │   │   │
│   │   │   Functions:                                                │   │   │
│   │   │   ├── startInvestigatorConversation()                       │   │   │
│   │   │   ├── answerInvestigatorQuestion()                          │   │   │
│   │   │   └── finalizeInvestigation()                               │   │   │
│   │   │                                                             │   │   │
│   │   │   Modules:                                                  │   │   │
│   │   │   ├── analyze.ts (narrative scoring)                        │   │   │
│   │   │   ├── gap_questions.ts (question generation)                │   │   │
│   │   │   ├── fill_gaps.ts (answer processing)                      │   │   │
│   │   │   ├── session_store.ts (conversation state)                 │   │   │
│   │   │   ├── state_sync.ts (database sync)                         │   │   │
│   │   │   └── finalize.ts (completion handling)                     │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        AI/LLM LAYER                                 │   │
│   │   ┌─────────────────────┐  ┌─────────────────────┐                  │   │
│   │   │    GPT-4o-mini      │  │ text-embedding-3    │                  │   │
│   │   │   (completions)     │  │    (embeddings)     │                  │   │
│   │   └─────────────────────┘  └─────────────────────┘                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Communication

### Event-Driven Architecture

Agents communicate through typed events streamed to the client:

```typescript
// Report Agent Events
type ReportAgentEvent =
  | { type: "log"; node: string; message: string }
  | { type: "incident_created"; node: string; incidentId: string }
  | { type: "notification"; node: string; notification: IncidentNotification }
  | { type: "enhanced_narrative"; node: string; content: string }
  | { type: "investigation_progress"; node: string; message: string }
  | { type: "error"; node: string; error: string }
  | { type: "complete"; node: string; incidentId: string }

// Investigation Agent Events
type InvestigationAgentEvent =
  | { type: "log"; node: string; message: string }
  | { type: "classification"; node: string; subtype: string }
  | { type: "questions_generated"; node: string; count: number }
  | { type: "error"; node: string; error: string }
  | { type: "complete"; node: string; incidentId: string }
```

### Streaming Response Pattern

Both agents use AsyncGenerators to stream events:

```typescript
export async function* runReportAgent(input: ReportAgentInput): AsyncGenerator<ReportAgentEvent> {
  yield { type: "log", node: "start_report", message: "Initializing..." }
  
  // ... processing ...
  
  yield { type: "complete", node: "node_exit_message", incidentId: incident.id }
}
```

The API routes convert these to JSONL streams:

```typescript
const stream = new ReadableStream({
  async start(controller) {
    for await (const event of runReportAgent(input)) {
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
    }
    controller.close()
  }
})
```

---

## The Handoff Pattern

The critical moment in the architecture is the **handoff** from Agent 1 to Agent 2:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE HANDOFF MOMENT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   REPORT AGENT                                                              │
│   └── create_incident_and_handoff node                                      │
│       │                                                                     │
│       ├── 1. CREATE INCIDENT                                                │
│       │   └── db.createIncidentFromReport({                                 │
│       │         narrative, residentName, residentRoom,                      │
│       │         residentState, environmentNotes                             │
│       │       })                                                            │
│       │                                                                     │
│       ├── 2. NOTIFY ADMINS                                                  │
│       │   └── db.createNotification({                                       │
│       │         type: "incident-created",                                   │
│       │         targetUserId: admin.id                                      │
│       │       })                                                            │
│       │                                                                     │
│       └── 3. TRIGGER INVESTIGATION (async)                                  │
│           └── for await (event of runInvestigationAgent(incident.id)) {     │
│                 yield { type: "investigation_progress", ...event }          │
│               }                                                             │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    INVESTIGATION AGENT                              │   │
│   │                    (runs immediately)                               │   │
│   │                                                                     │   │
│   │   ├── Loads incident                                                │   │
│   │   ├── Classifies subtype via LLM                                    │   │
│   │   ├── Routes to expert question templates                           │   │
│   │   ├── Generates tailored questions via LLM                          │   │
│   │   ├── Deduplicates against existing questions                       │   │
│   │   └── Queues 6-8 questions in database                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   Result: Staff sees incident created + questions waiting on their          │
│   dashboard, all within seconds of completing initial report.               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Handoff Guarantees

1. **Atomicity**: Incident is created before investigation starts
2. **Notification**: Admins are notified immediately
3. **Progress Visibility**: Investigation events stream back to client
4. **Failure Isolation**: Investigation failure doesn't lose the incident

---

## State Management

### Incident State Through the Pipeline

```typescript
// Initial state (after Report Agent)
{
  status: "open",
  investigation: {
    status: "not-started"
  },
  questions: [
    // Seed questions from voice report
    { source: "voice-report", answer: { ... } }
  ]
}

// After Investigation Agent
{
  status: "open",
  investigation: {
    status: "in-progress",
    subtype: "fall-wheelchair",
    startedAt: "2024-12-14T10:35:00.000Z"
  },
  questions: [
    { source: "voice-report", answer: { ... } },
    { source: "ai-generated", generatedBy: "investigation-agent" },
    { source: "ai-generated", generatedBy: "investigation-agent" },
    // ... 6-8 more
  ]
}

// After Expert Investigator completes
{
  status: "in-progress",
  investigation: {
    status: "completed",
    subtype: "fall-wheelchair",
    startedAt: "2024-12-14T10:35:00.000Z",
    completedAt: "2024-12-14T15:00:00.000Z",
    score: 85,
    completenessScore: 82,
    feedback: "Comprehensive report with good detail..."
  },
  questions: [
    // All questions now have answers
  ]
}
```

### Expert Investigator Session State

The conversational Expert Investigator maintains session state:

```typescript
interface InvestigatorSession {
  id: string
  incidentId: string
  investigatorId: string
  investigatorName: string
  nurseName: string
  
  // Current state
  state: AgentState              // Gold standard fields
  score: number                  // Current score
  completenessScore: number      // Percentage complete
  feedback: string               // AI feedback
  
  // Baseline (for comparison)
  baseScore: number
  baseCompletenessScore: number
  baseFeedback: string
  baseStrengths: string[]
  baseGaps: string[]
  
  // Conversation tracking
  pendingQuestions: PendingQuestion[]
  missingFields: MissingFieldDescriptor[]
  askedQuestionIds: string[]
  askedQuestions: string[]
  answersGiven: number
  
  // Timestamps
  createdAt: number
  updatedAt: number
}
```

---

## Gold Standards Integration

The agents are grounded in **Gold Standards** — expert-defined compliance checklists:

### Global Fall Standards (All Falls)

```typescript
interface GoldStandardFallReport {
  // Incident Basics
  resident_name: string
  room_number: string
  date_of_fall: string
  time_of_fall: string
  location_of_fall: string

  // Narrative
  fall_witnessed: boolean | null
  staff_narrative: string
  resident_statement: string

  // Resident State
  activity_at_time: string
  footwear: string
  clothing_issue: boolean | null
  reported_symptoms_pre_fall: string

  // Post-Fall Actions
  immediate_injuries_observed: string
  head_impact_suspected: boolean | null
  vitals_taken_post_fall: boolean | null
  neuro_checks_initiated: boolean | null
  physician_notified: boolean | null
  family_notified: boolean | null
  immediate_intervention_in_place: string

  // Environment & Care Plan
  assistive_device_in_use: string
  call_light_in_reach: boolean | null
  was_care_plan_followed: boolean | null
}
```

### Subtype-Specific Standards

Each fall subtype has additional required fields:

| Subtype | Key Fields |
|---------|------------|
| `fall-wheelchair` | brakes_locked, cushion_in_place, footrests_position |
| `fall-bed` | bed_height, bed_rails_status, floor_mat_present |
| `fall-slip` | floor_condition, spill_source, lighting_level |
| `fall-lift` | lift_type, staff_assisting_count, sling_condition |

### Scoring Algorithm

```
Score = (Filled Fields / Total Required Fields) × 100

Adjustments:
- Critical fields (injuries, physician notification) weighted 2x
- Subtype-specific fields weighted 1.5x
- Optional fields weighted 0.5x
```

---

## Implementation Files

### Core Agent Files

| File | Purpose |
|------|---------|
| `lib/agents/report_agent.ts` | Report Agent implementation |
| `lib/agents/investigation_agent.ts` | Investigation Agent implementation |
| `lib/agents/expert_investigator/graph.ts` | Expert Investigator main logic |
| `lib/agents/expert_investigator/analyze.ts` | Narrative analysis & scoring |
| `lib/agents/expert_investigator/gap_questions.ts` | Question generation |
| `lib/agents/expert_investigator/fill_gaps.ts` | Answer processing |
| `lib/agents/expert_investigator/session_store.ts` | Session management |
| `lib/agents/expert_investigator/state_sync.ts` | Database synchronization |
| `lib/agents/expert_investigator/finalize.ts` | Investigation completion |

### Supporting Files

| File | Purpose |
|------|---------|
| `lib/gold_standards.ts` | Type definitions for compliance standards |
| `lib/agents/incident-analyzer.ts` | AI report generation |
| `lib/agents/intelligence-qa.ts` | RAG Q&A agent |
| `lib/agents/intelligence-tools.ts` | LangChain tools |

### API Routes

| Route | Agent |
|-------|-------|
| `app/api/agent/report/route.ts` | Report Agent |
| `app/api/agent/investigate/route.ts` | Investigation Agent |
| `app/api/agent/report-conversational/route.ts` | Expert Investigator |

---

## Redis session store (Phase 3 — core hardening)

- **Client**: `lib/redis.ts` — lazy singleton; connects on first `getRedis()` in API / Node runtimes.
- **Expert investigator keys**: `waik:session:{sessionId}` — JSON `InvestigatorSession`, **TTL 7200 seconds** (2h). **Failure mode**: Redis errors surface as thrown `Error` from `session_store.ts` (no silent fallbacks to in-memory state).
- **Legacy interview work sessions** (beta `/api/agent/interview/*`): `waik:interview-work:{id}`, same TTL pattern via `lib/interview_work_session_store.ts`.
- **Env**: `REDIS_URL` and/or `REDIS_HOST` + `WAIK_REDIS_USER` / `WAIK_REDIS_USER_PASSWORD` — see `.env.example` (placeholders only; no production secrets in repo templates).

## Session consumer map

| Area | Functions | Notes |
|------|------------|--------|
| `lib/agents/expert_investigator/graph.ts` | `createSession`, `getSession`, `updateSession`, `deleteSession` | All **awaited**; drives investigator conversation. |
| `app/api/agent/report-conversational/route.ts` | `getSession` (pre-answer 404) + graph | `action: "start"` / `"answer"`. |
| `app/api/agent/interview/*` | `interview_work_session_store` (start/answer/complete) | `sessionId` in JSON; work-session key prefix `waik:interview-work:`. |
| `app/api/agent/investigate`, `report` | — | No session store. |

## report-conversational timeout handling

- **Platform**: `export const maxDuration = 60` in `app/api/agent/report-conversational/route.ts` (plan/host may still cap lower, e.g. Hobby ~10s).
- **App**: `Promise.race` with **45s** `createTimeout()` around `startInvestigatorConversation` and `answerInvestigatorQuestion`.
- **Partial response** (200, not 504): `{ status: "partial", sessionId, incidentId, message, questions?: [] }` — `sessionId` may be `null` on a slow **start** timeout.
- **Data**: `updateInvestigationProgressOnTimeout` in `lib/db.ts` best-effort; investigator Redis session is **not** deleted on timeout.

---

## Related Documentation

- [08-COMPONENTS.md](./08-COMPONENTS.md) — VoiceInputScreen, ErrorBoundary
- [09-STATE-MACHINES.md](./09-STATE-MACHINES.md) — Staff report `ReportPhase`
- [05-REPORT-AGENT.md](./05-REPORT-AGENT.md) - Detailed Report Agent documentation
- [06-INVESTIGATION-AGENT.md](./06-INVESTIGATION-AGENT.md) - Detailed Investigation Agent documentation
- [07-EXPERT-INVESTIGATOR.md](./07-EXPERT-INVESTIGATOR.md) - Expert Investigator documentation
- [09-GOLD-STANDARDS.md](./09-GOLD-STANDARDS.md) - Compliance standards reference

---

*The Two-Agent Architecture is the foundation of WAiK's intelligence. Understanding this pattern is essential for extending or modifying the system.*

