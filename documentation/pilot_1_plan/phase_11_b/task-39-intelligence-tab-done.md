## Status: DONE — 2026-06-06
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 3–4 hours
## Depends On: Task 38 (per-incident intelligence API functional)

---

## Why This Task Exists

Task 38 wires the per-incident intelligence API. This task surfaces it
where staff can actually use it: a fourth tab on the incident detail page.

**Key improvement over Cursor's version:** The tab maintains conversation
history. Nurses naturally ask follow-ups: "Was there a witness?" → "What
did the witness say?" → "Were family members notified?" A single-shot
interface breaks that flow. A conversation array preserves it.

---

## What This Task Creates / Modifies

### New component: `components/staff/staff-incident-intelligence-tab.tsx`

"use client" component.

Props:
```ts
interface StaffIncidentIntelligenceTabProps {
  incidentId: string
  incidentType: string
  phase: string
}
```

State:
```ts
const [conversation, setConversation] = useState<Array<{
  question: string
  answer: string
  citations: Array<{ questionText: string; answerText: string; tier: string; areaHint: string }>
  timestamp: Date
}>>([])
const [currentQuestion, setCurrentQuestion] = useState("")
const [isLoading, setIsLoading] = useState(false)
```

**Layout:**

SUGGESTED QUESTIONS (pill chips, visible only when conversation is empty):
- Fall type: "Was the resident injured?", "Who discovered the fall?",
  "What immediate actions were taken?", "Were family members notified?",
  "What was the environment like?"
- Medication type: "What medication was involved?", "Was a pharmacist contacted?",
  "Was the resident harmed?"
- Generic fallback: "Summarize the key findings", "What follow-up actions
  were documented?", "What notifications were made?"

Clicking a chip: sets currentQuestion, auto-submits.

CONVERSATION HISTORY (scrollable area):
- Each entry in the conversation array renders as:
  ```
  ┌─────────────────────────────┐
  │ Q: {question}               │  ← right-aligned bubble, teal bg
  └─────────────────────────────┘
  ┌─────────────────────────────┐
  │ {answer text}               │  ← left-aligned card, white bg
  │                             │
  │ Sources:                    │
  │ [Tier 1 | Narrative] Q: ... │  ← compact citation cards
  │ [Tier 2 | Environment] ...  │
  └─────────────────────────────┘
  ```
- Most recent conversation at the bottom (chat-style)
- Auto-scroll to bottom on new entry

LOADING STATE: Skeleton with pulsing "WAiK is analyzing..." text.

INPUT AREA (pinned to bottom):
- Textarea (single row, expands on focus)
- Placeholder: "Ask a question about this incident..."
- "Ask" button (teal, disabled while loading)
- Submit: POST /api/staff/incidents/{id}/intelligence with body:
  ```ts
  {
    question: currentQuestion,
    // Gap 2 fix — send full conversation history so follow-up questions have context
    conversationHistory: conversation.map(entry => ({
      question: entry.question,
      answer: entry.answer,
    })),
  }
  ```
  On success: append { question, answer, citations, timestamp } to conversation

EMPTY STATE (no answers vectorized yet):
- Brain icon (lucide-react)
- "No answers have been recorded for this incident yet. As you complete
  the report, intelligence will become available."
- Visible when the first API call returns the empty-state message

CITATION CARDS (compact):
```tsx
<div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm">
  <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium
                   bg-teal-100 text-teal-700">
    {tier === "tier1" ? "Tier 1" : tier === "tier2" ? "Tier 2" : "Closing"}
  </span>
  <div>
    <p className="font-medium text-gray-800">{questionText}</p>
    <p className="text-gray-600 line-clamp-2">{answerText}</p>
  </div>
</div>
```

### Modified: `components/staff/staff-incident-detail-view.tsx`

Add the fourth tab:
```tsx
<TabsTrigger value="intelligence">
  <Brain className="h-4 w-4 mr-1.5" />
  Intelligence
</TabsTrigger>
...
<TabsContent value="intelligence">
  <StaffIncidentIntelligenceTab
    incidentId={incident.id}
    incidentType={incident.incidentType}
    phase={incident.phase}
  />
</TabsContent>
```

Tab order: My Report | Questions | Intelligence | Status

Remove or replace the "Community Intelligence" external navigation link
in the Status tab and desktop sidebar. Replace with an internal action:
`onClick={() => setActiveTab("intelligence")}` — or simply remove the
link now that per-incident intelligence is available inline.

---

## Success Criteria

- [ ] Fourth "Intelligence" tab visible on staff incident detail page
- [ ] Suggested question chips visible when conversation is empty
- [ ] Clicking a chip submits the question and displays an answer
- [ ] Custom questions work via text input + Ask button
- [ ] Conversation history is maintained — multiple Q&A pairs displayed
- [ ] New entries auto-scroll to bottom
- [ ] Citations displayed as compact cards with tier badges
- [ ] Empty state shown when no vectors exist
- [ ] Tab works for both in-progress and completed incidents
- [ ] "Community Intelligence" external link replaced with internal tab switch
- [ ] `npm run build` passes

---

## Test Cases

```
TEST 1 — Suggested chip auto-submits
  Given: Intelligence tab open, incident has vectorized answers
  When: "Was the resident injured?" chip clicked
  Then: question appears in conversation; answer loads within 3s; citations shown
  Pass/Fail: ___

TEST 2 — Conversation history persists
  Given: staff asked one question and received an answer
  When: staff types a follow-up question and submits
  Then: both Q&A pairs are visible in conversation (scroll to see first)
  Pass/Fail: ___

TEST 3 — Custom question
  Given: Intelligence tab open
  When: staff types "What immediate actions were taken?" and clicks Ask
  Then: answer appears with relevant citations
  Pass/Fail: ___

TEST 4 — Empty state
  Given: incident has no documents in incident_answer_vectors
  When: Intelligence tab opened
  Then: Brain icon + empty state message shown; no crash
  Pass/Fail: ___

TEST 5 — In-progress incident
  Given: incident is phase_1_in_progress with 3 Tier 1 answers vectorized
  When: Intelligence tab opened and question asked
  Then: answer available from the 3 recorded answers
  Pass/Fail: ___

TEST 6 — Tab order
  Given: staff incident detail page
  Then: tabs are: My Report | Questions | Intelligence | Status
  Pass/Fail: ___

TEST 7 — Auto-scroll on new entry
  Given: conversation has 5+ entries (scrollable)
  When: new question submitted
  Then: conversation auto-scrolls to show the new answer
  Pass/Fail: ___
```

---

## Implementation Prompt

```
Phase 11 task 39: Intelligence tab with conversation history.

1. Create components/staff/staff-incident-intelligence-tab.tsx:
   "use client". Props: incidentId, incidentType, phase.
   
   STATE: conversation array (question, answer, citations, timestamp),
   currentQuestion string, isLoading boolean.
   
   Suggested question chips (seeded by incidentType). Visible when
   conversation is empty. onClick: setCurrentQuestion + auto-submit.
   
   Conversation history: render each entry as question bubble (right,
   teal bg) + answer card (left, white bg) + citation cards below.
   Chat-style layout. Auto-scroll to bottom via useRef + scrollIntoView.
   
   Input area pinned to bottom: textarea + Ask button (disabled while loading).
   Submit: POST /api/staff/incidents/{incidentId}/intelligence  [Gap 2 fix]
   Body: { question, conversationHistory: conversation.map(e => ({ question: e.question, answer: e.answer })) }
   This sends the full conversation history so the LLM can answer follow-up
   questions that reference prior answers (e.g. "What did she say?" after asking
   about a witness). Without this, every question is answered in isolation.
   On success: append to conversation array.
   
   Empty state: Brain icon + message when API returns the empty-state text.
   
   Citation cards: tier badge pill + questionText (bold) + answerText (truncated).

2. Modify components/staff/staff-incident-detail-view.tsx:
   Add Intelligence tab as 4th tab (import Brain from lucide-react).
   Tab order: My Report | Questions | Intelligence | Status.
   Replace "Community Intelligence" external link with internal tab switch.

3. npm run typecheck and npm run build.
```

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `components/staff/staff-incident-intelligence-tab.tsx` | **New** — Intelligence tab with conversation history |
| `components/staff/staff-incident-detail-view.tsx` | Add Intelligence tab; update tab order; replace external link |
