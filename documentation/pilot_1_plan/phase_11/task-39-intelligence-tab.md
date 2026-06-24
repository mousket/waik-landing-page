# Task 39 — Intelligence tab on staff incident detail page
## Status: OPEN
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 2–3 hours
## Depends On: Task 38 (per-incident intelligence API functional)

---

## Why This Task Exists

Task 38 wires the per-incident intelligence API. This task surfaces it where staff can actually use it: a **fourth tab** on `staff-incident-detail-view.tsx` titled "Intelligence". Staff can ask natural-language questions about the specific incident they are viewing and receive answers grounded in that incident's recorded Q&A — with inline citations.

---

## What This Task Creates / Modifies

### New component: `components/staff/staff-incident-intelligence-tab.tsx`

A client component that renders the Intelligence tab body. Props:

```ts
interface StaffIncidentIntelligenceTabProps {
  incidentId: string
  incidentType: string     // used for suggested question seeding
  phase: string            // used to show "in progress" context
}
```

**Layout:**

**Suggested questions** (seeded from incident type, displayed as pill chips):
- For `fall` type: "Was the resident injured?", "Who discovered the fall?", "What immediate actions were taken?", "Were family members notified?"
- For `medication` type: "What medication was involved?", "Was a pharmacist contacted?", "Was the resident harmed?"
- Generic fallback: "Summarize the key findings", "What follow-up actions were documented?", "What notifications were made?"

Each chip, when clicked, populates the text input and auto-submits.

**Text input + submit button:**
- Textarea (single row, expand on focus) with placeholder "Ask a question about this incident…"
- "Ask" button; disabled while loading.

**Answer area:**
- Loading skeleton while fetching.
- Answer text rendered via `renderMarkdownOrHtml` (already used in `staff-incident-detail-view.tsx`).
- Citations section below the answer: a row of compact cards, one per citation:
  ```
  [Tier badge]  Q: {questionText}
                A: {answerText (truncated at 120 chars)}
  ```
  Citations use the `residentRecordPillClass()` pill pattern for tier badges (matches incident Q&A styling).

**Empty state (no answers yet):**
- Show "No answers have been recorded for this incident yet. As you complete the report, intelligence will become available."
- Icon: `Brain` from lucide-react.

**API call:**
```ts
const res = await fetch(
  `/api/staff/incidents/${incidentId}/intelligence?question=${encodeURIComponent(question)}`
)
const { answer, citations } = await res.json()
```

### Modified: `components/staff/staff-incident-detail-view.tsx`

Add the fourth tab:

```tsx
<TabsTrigger value="intelligence">Intelligence</TabsTrigger>
...
<TabsContent value="intelligence">
  <StaffIncidentIntelligenceTab
    incidentId={incident.id}
    incidentType={incident.incidentType}
    phase={incident.phase}
  />
</TabsContent>
```

**Tab order:** My report | Questions | Intelligence | Status  
(Move Intelligence before Status — it is an active tool, not a passive status view.)

Remove or update the existing "Community Intelligence" navigation links from the Status tab and the desktop sidebar that currently point to `/staff/intelligence` with no incident context. Replace them with an in-page link to the Intelligence tab (`onClick={() => setActiveTab("intelligence")}`), or simply remove the external link now that per-incident intelligence is available inline.

---

## Success Criteria

- [ ] A fourth "Intelligence" tab appears on the staff incident detail page.
- [ ] Clicking a suggested question chip sends the question and displays an answer.
- [ ] Typing a custom question and clicking "Ask" returns a relevant answer.
- [ ] Citations are displayed below the answer as compact cards with tier badges.
- [ ] When no answers have been vectorized yet, the empty state message is shown.
- [ ] The tab is functional for both `phase_1_in_progress` and `phase_1_complete` incidents.
- [ ] The existing "Community Intelligence" external link no longer navigates away from the incident.
- [ ] `npm run typecheck` and `npm run build` pass.

---

## Test Cases (manual)

```
TEST 1 — Suggested question chip
  Given: Intelligence tab is open; incident has vectorized answers
  When:  "Was the resident injured?" chip is clicked
  Then:  question populates the input; answer appears within 3s; citations shown

TEST 2 — Custom question
  Given: Intelligence tab is open
  When:  staff types "What immediate actions were taken?" and clicks Ask
  Then:  answer appears with relevant citations from the incident's Q&A

TEST 3 — Empty state
  Given: incident has no documents in incident_answer_vectors
  When:  Intelligence tab is opened
  Then:  empty state message and Brain icon are shown; no crash

TEST 4 — In-progress incident
  Given: incident is phase_1_in_progress with 3 answered Tier 1 questions vectorized
  When:  staff member opens Intelligence tab
  Then:  intelligence is available for the 3 recorded answers

TEST 5 — Citation cards
  Given: answer is returned with citations
  Then:  citation cards show tier badge, question text, and truncated answer text
         matching the pill visual style used elsewhere in the incident detail view

TEST 6 — Tab order
  Given: staff incident detail page
  Then:  tab order is: My report | Questions | Intelligence | Status
```

---

## Implementation prompt

```
Phase 11 task 39: Intelligence tab on staff incident detail page.

1. Create components/staff/staff-incident-intelligence-tab.tsx:
   - Client component; props: incidentId, incidentType, phase
   - Suggested question chips seeded by incidentType (fall, medication, generic)
   - Textarea input + Ask button
   - Fetch GET /api/staff/incidents/{incidentId}/intelligence?question=...
   - Render answer via renderMarkdownOrHtml; render citations as compact cards
     with tier badge (residentRecordPillClass pattern) + truncated Q/A text
   - Empty state when answer is "No answers have been recorded..."

2. Modify components/staff/staff-incident-detail-view.tsx:
   - Add "Intelligence" TabsTrigger and TabsContent
   - Tab order: My report | Questions | Intelligence | Status
   - Replace the "Community Intelligence" external link in the Status tab and
     sidebar with an internal link/button that activates the Intelligence tab
     (lift active tab state if needed, or use a simple Link with #intelligence)

3. npm run typecheck and npm run build.
```

---

## Files to create / modify

| File | Change |
|------|--------|
| `components/staff/staff-incident-intelligence-tab.tsx` | **New** — Intelligence tab UI component |
| `components/staff/staff-incident-detail-view.tsx` | Add Intelligence tab; update tab order; replace external intelligence link |
