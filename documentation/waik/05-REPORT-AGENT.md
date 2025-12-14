# WAiK Report Agent (Agent 1)

**Version**: 1.0  
**Last Updated**: December 2024  
**File**: `lib/agents/report_agent.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Purpose & Design](#purpose--design)
3. [Input & Output](#input--output)
4. [Agent Flow](#agent-flow)
5. [Node Descriptions](#node-descriptions)
6. [Event Types](#event-types)
7. [Narrative Enhancement](#narrative-enhancement)
8. [Handoff to Investigation](#handoff-to-investigation)
9. [Error Handling](#error-handling)
10. [Usage Examples](#usage-examples)

---

## Overview

The **Report Agent** (also called "Agent 1" or "The Reporter") is the live, at-the-scene agent that captures incident information from staff members. It's designed to be fast (under 5 minutes), voice-friendly, and minimal in its demands on the reporter.

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Mode** | Live, synchronous |
| **Duration** | Under 5 minutes |
| **Input** | Voice or text narrative |
| **Output** | Created incident + triggered investigation |
| **User** | Staff member at the scene |

---

## Purpose & Design

### What It Does

1. **Captures essential facts** — resident name, room, narrative description
2. **Enhances narrative** — uses AI to create a professional summary
3. **Creates incident record** — saves to database immediately
4. **Notifies admins** — sends notifications to all administrators
5. **Triggers investigation** — hands off to Investigation Agent

### What It Doesn't Do

- ❌ Ask detailed follow-up questions (that's Agent 2's job)
- ❌ Classify incident subtype (that's Agent 2's job)
- ❌ Score the report (that's the Expert Investigator's job)
- ❌ Keep the staff member waiting for analysis

### Design Philosophy

> "Get the key facts, get out, let the system do the rest."

The Report Agent prioritizes:
1. **Speed** over completeness
2. **Natural language** over structured forms
3. **Core facts** over exhaustive detail
4. **Immediate handoff** over blocking analysis

---

## Input & Output

### Input Interface

```typescript
interface ReportAgentInput {
  residentName: string      // Required: Resident's full name
  residentRoom: string      // Required: Room number
  narrative: string         // Required: What happened (voice transcript or text)
  residentState?: string    // Optional: Current condition of resident
  environmentNotes?: string // Optional: Room/environment observations
  reportedById: string      // Required: Reporter's user ID
  reportedByName: string    // Required: Reporter's display name
  reportedByRole: UserRole  // Required: "staff" or "admin"
}
```

### Output Events

The agent yields a stream of typed events:

```typescript
type ReportAgentEvent =
  | { type: "log"; node: string; message: string }
  | { type: "incident_created"; node: "create_incident_and_handoff"; incidentId: string }
  | { type: "notification"; node: "create_incident_and_handoff"; notification: IncidentNotification }
  | { type: "enhanced_narrative"; node: "enhance_narrative"; content: string }
  | { type: "investigation_progress"; node: string; message: string }
  | { type: "error"; node: string; error: string }
  | { type: "complete"; node: "node_exit_message"; incidentId: string }
```

### Final Result

When complete, the database contains:
- New incident with `status: "open"`
- Initial report with narrative, resident state, environment notes
- Seed questions (auto-generated from narrative sections)
- Investigation with `status: "in-progress"` (from Agent 2)
- 6-8 follow-up questions (from Agent 2)

---

## Agent Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REPORT AGENT FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      1. START_REPORT                                │   │
│   │                                                                     │   │
│   │   • Validate input (required fields)                                │   │
│   │   • Log initialization                                              │   │
│   │   • Emit: { type: "log", node: "start_report", ... }                │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    2. CAPTURE_NARRATIVE                             │   │
│   │                                                                     │   │
│   │   • Acknowledge receipt of narrative                                │   │
│   │   • Log capture                                                     │   │
│   │   • Emit: { type: "log", node: "capture_narrative", ... }           │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    3. ENHANCE_NARRATIVE                             │   │
│   │                    (Optional - requires OpenAI)                     │   │
│   │                                                                     │   │
│   │   • If OpenAI configured:                                           │   │
│   │     └── Call LLM to create professional summary                     │   │
│   │     └── Format as HTML                                              │   │
│   │     └── Emit: { type: "enhanced_narrative", content: "<p>..." }     │   │
│   │   • If not configured:                                              │   │
│   │     └── Skip enhancement                                            │   │
│   │     └── Emit: { type: "log", message: "OpenAI not configured..." }  │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                 4. CREATE_INCIDENT_AND_HANDOFF                      │   │
│   │                 (The Critical Node)                                 │   │
│   │                                                                     │   │
│   │   A. Create Incident:                                               │   │
│   │      └── db.createIncidentFromReport(...)                           │   │
│   │      └── Emit: { type: "incident_created", incidentId: "..." }      │   │
│   │                                                                     │   │
│   │   B. Notify Admins:                                                 │   │
│   │      └── Find all users with role: "admin"                          │   │
│   │      └── Create notification for each                               │   │
│   │      └── Emit: { type: "notification", ... } for each               │   │
│   │                                                                     │   │
│   │   C. Trigger Investigation Agent:                                   │   │
│   │      └── for await (event of runInvestigationAgent(incidentId))     │   │
│   │      └── Re-emit events as { type: "investigation_progress", ... }  │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    5. NODE_EXIT_MESSAGE                             │   │
│   │                                                                     │   │
│   │   • Signal completion                                               │   │
│   │   • Emit: { type: "complete", incidentId: "..." }                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Node Descriptions

### Node 1: start_report

**Purpose**: Initialize the agent and validate input.

```typescript
// Validation
const requiredFields: Array<keyof ReportAgentInput> = [
  "residentName",
  "residentRoom",
  "narrative",
  "reportedById",
  "reportedByName",
  "reportedByRole",
]

const missing = requiredFields.filter((field) => !input[field])
if (missing.length > 0) {
  throw new Error(`Missing required fields: ${missing.join(", ")}`)
}
```

**Emits**: `{ type: "log", node: "start_report", message: "Initializing reporter agent" }`

---

### Node 2: capture_narrative

**Purpose**: Acknowledge the narrative has been received.

This is a passthrough node that confirms the input was captured. In a voice-enabled UI, this is where the system would confirm "I got it" to the user.

**Emits**: `{ type: "log", node: "capture_narrative", message: "Captured resident details and narrative description" }`

---

### Node 3: enhance_narrative

**Purpose**: Use AI to create a professional clinical summary.

**Process**:
1. Check if OpenAI is configured
2. If yes, call LLM with professional summarization prompt
3. Convert response to HTML format
4. Store as `enhancedNarrative`

**LLM Prompt**:
```
You are a clinical documentation assistant. Rewrite staff-provided 
incident notes into a concise, professional summary. Highlight 
resident condition, key events, observed injuries, and environmental 
factors. Avoid speculation or new facts. Return clear, professional 
language without markdown.
```

**Emits**: 
- Success: `{ type: "enhanced_narrative", content: "<p>Professional summary...</p>" }`
- Skip: `{ type: "log", message: "OpenAI not configured; skipping enhanced narrative step" }`
- Error: `{ type: "error", error: "Failed to enhance narrative: ..." }`

---

### Node 4: create_incident_and_handoff

**Purpose**: The critical node that creates the incident and triggers investigation.

**Step A: Create Incident**

```typescript
const incident = await createIncidentFromReport({
  title: `${input.residentName} Incident Report`,
  narrative: input.narrative,
  residentName: input.residentName,
  residentRoom: input.residentRoom,
  residentState: input.residentState,
  environmentNotes: input.environmentNotes,
  reportedById: input.reportedById,
  reportedByName: input.reportedByName,
  reportedByRole: input.reportedByRole,
  enhancedNarrative,
})
```

This creates:
- Incident record with `status: "open"`
- Initial report subdocument
- Seed questions from narrative sections (auto-answered)

**Step B: Notify Admins**

```typescript
const users = await getUsers()
const admins = users.filter((user) => user.role === "admin")

for (const admin of admins) {
  const notification = await createNotification({
    incidentId: incident.id,
    targetUserId: admin.id,
    type: "incident-created",
    message: `New incident reported for ${incident.residentName} (Room ${incident.residentRoom}).`,
  })
  
  yield { type: "notification", node: "create_incident_and_handoff", notification }
}
```

**Step C: Trigger Investigation**

```typescript
for await (const event of runInvestigationAgent(incident.id)) {
  switch (event.type) {
    case "log":
      yield { type: "investigation_progress", node: `investigation:${event.node}`, message: event.message }
      break
    case "classification":
      yield { type: "investigation_progress", node: "investigation:classify_subtype", message: `Subtype classified as ${event.subtype}` }
      break
    case "questions_generated":
      yield { type: "investigation_progress", node: "investigation:queue_questions", message: `Queued ${event.count} follow-up questions` }
      break
    // ... handle other events
  }
}
```

---

### Node 5: node_exit_message

**Purpose**: Signal successful completion.

**Emits**: `{ type: "complete", node: "node_exit_message", incidentId: incident.id }`

---

## Event Types

### Log Events

Progress updates for the UI:

```json
{
  "type": "log",
  "node": "start_report",
  "message": "Initializing reporter agent"
}
```

### Incident Created Event

Confirms the incident was saved:

```json
{
  "type": "incident_created",
  "node": "create_incident_and_handoff",
  "incidentId": "inc-1734567890123"
}
```

### Notification Event

Admin notification sent:

```json
{
  "type": "notification",
  "node": "create_incident_and_handoff",
  "notification": {
    "id": "notif-1734567890123",
    "incidentId": "inc-1734567890123",
    "type": "incident-created",
    "message": "New incident reported for Margaret Chen (Room 204A).",
    "targetUserId": "user-admin-1",
    "createdAt": "2024-12-14T10:30:00.000Z"
  }
}
```

### Enhanced Narrative Event

AI-generated professional summary:

```json
{
  "type": "enhanced_narrative",
  "node": "enhance_narrative",
  "content": "<p>On December 14, 2024, at approximately 10:30 AM, staff member Sarah Johnson discovered resident Margaret Chen on the floor adjacent to her wheelchair in Room 204A.</p><ul><li>Resident was alert and oriented</li><li>Complained of right hip pain</li><li>Wheelchair brakes were not engaged</li></ul>"
}
```

### Investigation Progress Events

Forwarded from Investigation Agent:

```json
{
  "type": "investigation_progress",
  "node": "investigation:classify_subtype",
  "message": "Subtype classified as fall-wheelchair"
}
```

### Error Events

When something goes wrong:

```json
{
  "type": "error",
  "node": "enhance_narrative",
  "error": "Failed to enhance narrative: OpenAI rate limit exceeded"
}
```

### Complete Event

Final success signal:

```json
{
  "type": "complete",
  "node": "node_exit_message",
  "incidentId": "inc-1734567890123"
}
```

---

## Narrative Enhancement

The narrative enhancement feature transforms casual voice input into professional documentation.

### Input Example

```
"I found Mrs. Chen on the floor next to her wheelchair. She says her 
hip hurts. The brakes weren't locked on the chair. She's awake and 
talking but seems upset."
```

### Enhanced Output

```html
<p>On December 14, 2024, staff member Sarah Johnson discovered resident 
Margaret Chen on the floor adjacent to her wheelchair in Room 204A. The 
resident was alert and oriented upon discovery.</p>

<p>Key observations:</p>
<ul>
  <li>Resident complaining of right hip discomfort</li>
  <li>Wheelchair brakes were not engaged at time of discovery</li>
  <li>Resident appeared emotionally distressed but cognitively intact</li>
</ul>

<p>Immediate assessment indicates the resident was conscious and able to 
communicate. Further evaluation recommended to rule out hip injury.</p>
```

### HTML Formatting

The enhancement process converts markdown-like output to HTML:

```typescript
const formatSummaryAsHtml = (value: string) => {
  const blocks = value.split(/\n{2,}/)
  
  const htmlBlocks = blocks.map((block) => {
    const lines = block.split(/\n/)
    const bulletLines = lines.filter((line) => line.startsWith("- "))
    const nonBulletLines = lines.filter((line) => !line.startsWith("- "))
    
    const parts: string[] = []
    
    if (nonBulletLines.length > 0) {
      parts.push(`<p>${formatInlineHtml(nonBulletLines.join(" "))}</p>`)
    }
    
    if (bulletLines.length > 0) {
      const items = bulletLines.map((line) => `<li>${formatInlineHtml(line.slice(2))}</li>`).join("")
      parts.push(`<ul>${items}</ul>`)
    }
    
    return parts.join("")
  })
  
  return htmlBlocks.join("")
}
```

---

## Handoff to Investigation

The handoff is the most critical part of the Report Agent. It ensures:

1. **Atomicity**: The incident exists before investigation starts
2. **Visibility**: The incident appears on dashboards immediately
3. **Continuity**: Investigation events stream back to the client
4. **Resilience**: Investigation failure doesn't lose the incident

### Handoff Code

```typescript
// Investigation runs inline and events are forwarded
for await (const event of runInvestigationAgent(incident.id)) {
  switch (event.type) {
    case "log":
      yield {
        type: "investigation_progress",
        node: `investigation:${event.node}`,
        message: event.message,
      }
      break
    case "classification":
      yield {
        type: "investigation_progress",
        node: "investigation:classify_subtype",
        message: `Subtype classified as ${event.subtype}`,
      }
      break
    case "questions_generated":
      yield {
        type: "investigation_progress",
        node: "investigation:queue_questions",
        message: `Queued ${event.count} follow-up questions for staff`,
      }
      break
    case "error":
      yield {
        type: "error",
        node: `investigation:${event.node}`,
        error: event.error,
      }
      break
    case "complete":
      yield {
        type: "log",
        node: "investigation:complete",
        message: "Investigation agent completed",
      }
      break
  }
}
```

---

## Error Handling

### Validation Errors

Thrown before processing starts:

```typescript
if (missing.length > 0) {
  throw new Error(`Missing required fields: ${missing.join(", ")}`)
}
```

### Enhancement Errors

Non-fatal, logged and skipped:

```typescript
try {
  const summary = await generateEnhancedNarrative({ ... })
  // ...
} catch (enhancementError) {
  yield {
    type: "error",
    node: "enhance_narrative",
    error: `Failed to enhance narrative: ${String(enhancementError)}`,
  }
  // Continue without enhancement
}
```

### Notification Errors

Non-fatal, logged and continued:

```typescript
try {
  // Send notifications
} catch (notificationError) {
  yield {
    type: "error",
    node: "create_incident_and_handoff",
    error: `Failed to create admin notifications: ${String(notificationError)}`,
  }
  // Continue to investigation
}
```

### Fatal Errors

Caught at top level:

```typescript
try {
  // All processing
} catch (error) {
  yield {
    type: "error",
    node: "report_agent",
    error: error instanceof Error ? error.message : String(error),
  }
}
```

---

## Usage Examples

### API Call

```bash
curl -X POST http://localhost:3000/api/agent/report \
  -H "Content-Type: application/json" \
  -d '{
    "residentName": "Margaret Chen",
    "roomNumber": "204A",
    "narrative": "Found resident on floor next to wheelchair. Brakes not locked. She is alert but complaining of hip pain.",
    "residentState": "Alert, oriented, complaining of right hip pain",
    "environmentNotes": "Wheelchair nearby, brakes unlocked, no spills visible",
    "reportedBy": "user-1",
    "reportedByName": "Sarah Johnson, RN",
    "reportedByRole": "staff"
  }'
```

### Response Stream

```
{"type":"log","node":"start_report","message":"Initializing reporter agent"}
{"type":"log","node":"capture_narrative","message":"Captured resident details and narrative description"}
{"type":"log","node":"enhance_narrative","message":"Enhancing narrative with AI summary"}
{"type":"enhanced_narrative","node":"enhance_narrative","content":"<p>On December 14, 2024...</p>"}
{"type":"log","node":"create_incident_and_handoff","message":"Creating incident record and seeding initial report"}
{"type":"incident_created","node":"create_incident_and_handoff","incidentId":"inc-1734567890123"}
{"type":"notification","node":"create_incident_and_handoff","notification":{...}}
{"type":"log","node":"create_incident_and_handoff","message":"Running investigator agent to generate follow-up questions"}
{"type":"investigation_progress","node":"investigation:load_and_analyze","message":"Loading incident data"}
{"type":"investigation_progress","node":"investigation:classify_subtype","message":"Subtype classified as fall-wheelchair"}
{"type":"investigation_progress","node":"investigation:queue_questions","message":"Queued 6 follow-up questions for staff"}
{"type":"log","node":"investigation:complete","message":"Investigation agent completed"}
{"type":"complete","node":"node_exit_message","incidentId":"inc-1734567890123"}
```

### Frontend Integration

```typescript
const response = await fetch('/api/agent/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reportData),
})

const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  const lines = decoder.decode(value).split('\n').filter(Boolean)
  for (const line of lines) {
    const event = JSON.parse(line)
    
    switch (event.type) {
      case 'log':
        console.log(`[${event.node}] ${event.message}`)
        break
      case 'incident_created':
        console.log(`Incident created: ${event.incidentId}`)
        break
      case 'complete':
        // Redirect to incident detail page
        router.push(`/staff/incidents/${event.incidentId}`)
        break
    }
  }
}
```

---

## Related Documentation

- [04-AGENTIC-ARCHITECTURE.md](./04-AGENTIC-ARCHITECTURE.md) - System architecture
- [06-INVESTIGATION-AGENT.md](./06-INVESTIGATION-AGENT.md) - Investigation Agent (receives handoff)
- [03-API-REFERENCE.md](./03-API-REFERENCE.md) - API endpoint details

---

*The Report Agent is the entry point for all voice-reported incidents. It's designed for speed and simplicity, delegating complex analysis to Agent 2.*

