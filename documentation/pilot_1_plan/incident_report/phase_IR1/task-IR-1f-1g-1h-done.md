# Task IR-1f — Wire Report Page to Real API Calls
## Phase: IR-1 — Incident Reporting Frontend + Backend Wiring
## Estimated Time: 3–4 hours
## Depends On: IR-1e complete (all three routes working)

---

## Why This Task Exists

The report page has the state machine, VoiceInputScreen, and the phase
transitions — but every API call is stubbed. This task replaces stubs
with real fetch calls to the three new routes. When done, every nurse
interaction on the report page creates real data in MongoDB and Redis.

---

## What This Task Modifies

1. `app/staff/report/page.tsx` — real API integration

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] "Start Report" from resident_splash calls POST /api/report/start
- [ ] sessionId from start response stored in component state
- [ ] Tier 1 questions from start response populate the question board
- [ ] Every VoiceInputScreen onSubmit calls POST /api/report/answer
- [ ] activeMs tracked (Date.now() on question open, diff on submit)
- [ ] Gap analysis transition driven by API response (status: "gap_analysis_complete")
- [ ] Tier 2 questions from API response populate the question board
- [ ] Question board updates after each Tier 2 answer (questions removed, new questions added)
- [ ] CompletionRing updates from API response completenessScore
- [ ] "Answer Later" calls POST /api/report/answer with __DEFER_ALL__
- [ ] After deferral, navigates to dashboard
- [ ] Closing questions from API response populate the question board
- [ ] Sign-off calls POST /api/report/complete
- [ ] Report card data from complete response populates the reportcard phase
- [ ] Loading states visible during API calls (isSubmitting)
- [ ] Error handling: if any API call fails, show error in ErrorBoundary

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am wiring the WAiK staff report page to real API calls.
The page already has the ReportPhase state machine, VoiceInputScreen,
and phase transitions. I need to replace stubs with real fetch calls.

REFERENCE: Read the architectural blueprint at
plan/pilot_1/blueprint/WAiK_Incident_Reporting_Blueprint.md
Section 5 (Frontend State Machine Integration).

MODIFY app/staff/report/page.tsx

═══════════════════════════════════════════════════════════
CHANGES TO STATE VARIABLES
═══════════════════════════════════════════════════════════

KEEP all existing state variables. ADD these:

const [isSubmitting, setIsSubmitting] = useState(false)
const [currentQuestionStartMs, setCurrentQuestionStartMs] = useState(0)

CHANGE sessionId: it is currently always null. It will now be set
from the /api/report/start response.

═══════════════════════════════════════════════════════════
CHANGE 1: createDraftIncident → call POST /api/report/start
═══════════════════════════════════════════════════════════

Replace the existing createDraftIncident function. Instead of calling
postIncidentOrQueue, call the new API:

async function createDraftIncident() {
  setIsCreating(true)
  try {
    const res = await fetch("/api/report/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidentType: selectedTypeKey,
        residentId: selectedResident?.residentId || "",
        residentName: selectedResident?.residentName || "",
        residentRoom: selectedResident?.residentRoom || "",
        location: selectedResident?.residentRoom
          ? `Room ${selectedResident.residentRoom}`
          : "Unknown",
        incidentDate: new Date().toISOString().split("T")[0],
        incidentTime: new Date().toTimeString().slice(0, 5),
        hasInjury: null,  // TODO: capture from splash screen
        witnessesPresent: null,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Failed to start report")
    }

    const data = await res.json()
    setSessionId(data.sessionId)
    setIncidentId(data.incidentId)

    // Set Tier 1 questions from API response
    // Map API questions to the format the question board expects
    setTier1Questions(data.tier1Questions)

    setPhase("tier1_board")
  } catch (err) {
    console.error("Failed to create incident:", err)
    // Show error to user — use existing error handling pattern
  } finally {
    setIsCreating(false)
  }
}

═══════════════════════════════════════════════════════════
CHANGE 2: handleAnswer → call POST /api/report/answer
═══════════════════════════════════════════════════════════

Replace the existing handleAnswer function:

async function handleAnswer(question: ActiveQuestion, transcript: string) {
  const activeMs = Date.now() - currentQuestionStartMs
  setIsSubmitting(true)

  try {
    const res = await fetch("/api/report/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionId: question.id,
        transcript: transcript.trim(),
        tier: question.tier,
        activeMs,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Failed to submit answer")
    }

    const data = await res.json()

    // Update completeness score from server
    setCompletionPercent(data.completenessScore || 0)

    // Mark question as answered
    setAnsweredIds(prev => new Set([...prev, question.id]))
    setAnswers(prev => ({ ...prev, [question.id]: transcript.trim() }))

    // Handle response status
    switch (data.status) {
      case "tier1_updated":
        // Stay on tier1_board
        setActiveQuestion(null)
        setPhase("tier1_board")
        break

      case "gap_analysis_complete":
        // Move to tier2_board with new questions
        setTier2Questions(data.tier2Questions || [])
        setActiveQuestion(null)
        setPhase("tier2_board")
        break

      case "tier2_updated":
        // Update tier2 board: remove covered questions, add new ones
        setTier2Questions(data.remainingQuestions || [])
        setActiveQuestion(null)
        setPhase("tier2_board")
        break

      case "closing_ready":
        // Move to closing questions
        setClosingQuestions(data.closingQuestions || [])
        setActiveQuestion(null)
        setPhase("closing")
        break

      case "closing_updated":
        if (data.allClosingComplete) {
          setActiveQuestion(null)
          setPhase("signoff")
        } else {
          setActiveQuestion(null)
          setPhase("closing")
        }
        break
    }
  } catch (err) {
    console.error("Failed to submit answer:", err)
  } finally {
    setIsSubmitting(false)
  }
}

═══════════════════════════════════════════════════════════
CHANGE 3: handleDefer → call POST /api/report/answer __DEFER_ALL__
═══════════════════════════════════════════════════════════

async function handleDeferAll() {
  setIsSubmitting(true)
  try {
    await fetch("/api/report/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionId: "__DEFER_ALL__",
        transcript: "",
        tier: "tier2",
      }),
    })

    // Navigate to dashboard
    router.push("/staff/dashboard")
  } catch (err) {
    console.error("Failed to defer:", err)
  } finally {
    setIsSubmitting(false)
  }
}

═══════════════════════════════════════════════════════════
CHANGE 4: handleSignOff → call POST /api/report/complete
═══════════════════════════════════════════════════════════

async function handleSignOff(editedSections?: Record<string, string>) {
  setIsSubmitting(true)
  try {
    const res = await fetch("/api/report/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        editedSections,
        signature: {
          declaration: "I confirm this report reflects my observations and actions.",
          signedAt: new Date().toISOString(),
        },
      }),
    })

    if (!res.ok) throw new Error("Failed to complete report")

    const data = await res.json()
    setReportCardData(data.reportCard)
    setPhase("reportcard")
  } catch (err) {
    console.error("Failed to sign off:", err)
  } finally {
    setIsSubmitting(false)
  }
}

═══════════════════════════════════════════════════════════
CHANGE 5: Track time in VoiceInputScreen
═══════════════════════════════════════════════════════════

When opening a question (setting activeQuestion), also record start time:

function openQuestion(question: ActiveQuestion) {
  setActiveQuestion(question)
  setCurrentQuestionStartMs(Date.now())  // ADD THIS
  setPhase("answering")
}

═══════════════════════════════════════════════════════════
CHANGE 6: Remove simulated gap analysis
═══════════════════════════════════════════════════════════

Delete the useEffect that watches for phase === "gap_analysis" and
transitions to tier2_board after 2 seconds. The gap analysis is now
triggered by the API response (status: "gap_analysis_complete").

However, you may want to show a brief loading state while the API
call is processing. The gap analysis API call (the final Tier 1 answer)
takes 3-8 seconds due to LLM processing. Show the gap_analysis phase
screen (loading indicator) while isSubmitting is true and the current
phase transition is happening.

═══════════════════════════════════════════════════════════
CHANGE 7: Gap analysis loading state
═══════════════════════════════════════════════════════════

In the "tier1_board" phase renderer, when the nurse answers the last
Tier 1 question, the API call will take several seconds. During this
time, show a loading state instead of immediately returning to the
board. The cleanest approach:

In handleAnswer, when the response comes back with
status: "gap_analysis_complete", the phase transitions to "tier2_board".
But BEFORE setting the new phase, briefly show "gap_analysis" phase:

case "gap_analysis_complete":
  // Show loading briefly
  setPhase("gap_analysis")
  // Then after a short delay (or immediately), show tier2
  setTimeout(() => {
    setTier2Questions(data.tier2Questions || [])
    setPhase("tier2_board")
  }, 1500)  // 1.5s transition for the loading animation
  break

This gives the nurse a visual beat — "WAiK is analyzing your report" —
before the Tier 2 board appears.

Run npm run build. Fix all TypeScript errors.
Verify the full flow from type_select through reportcard works end to end.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_IR1/task-IR-1f-DONE.md`

---
---

# Task IR-1g — Data-Driven Question Board Component
## Phase: IR-1 — Incident Reporting Frontend + Backend Wiring
## Estimated Time: 3–4 hours
## Depends On: IR-1f complete (report page wired to API)

---

## Why This Task Exists

The question board is the nurse's primary interaction surface. It must
render questions from API data, show which are answered, animate
question removal when gaps are implicitly filled, show the completion
ring, and provide the "Answer Later" option on Tier 2 boards. This
component replaces any hardcoded question lists with a real data-driven
board that responds to server state.

---

## What This Task Creates

1. `components/staff/question-board.tsx` — the question board component

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] QuestionBoard renders questions from an array prop
- [ ] Each question card is tappable (min 64px height, 48px touch target)
- [ ] Answered questions show green checkmark and answer snippet
- [ ] Unanswered questions show empty status indicator
- [ ] CompletionRing visible in top-right corner with current percentage
- [ ] "Answer Later" button visible on Tier 2 boards (not Tier 1)
- [ ] Questions that are removed (questionsRemoved from API) fade out with animation
- [ ] New questions that appear (newQuestions from API) fade in with animation
- [ ] Question cards show areaHint in muted text below the question text
- [ ] Loading state visible when isSubmitting (after tapping a question)
- [ ] Board title changes by phase: "Initial Questions" / "Follow-up Questions" / "Closing Questions"
- [ ] Dark teal header bar matches dashboard visual DNA
- [ ] 375px viewport: all questions visible with scroll, no horizontal overflow

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am building the data-driven question board component for WAiK.
This replaces any hardcoded question lists in the report page.

READ components/shared/completion-ring.tsx for the existing ring component.
READ components/shared/phase-badge.tsx for the existing badge styling.
READ lib/design-tokens.ts for the brand color values.

CREATE components/staff/question-board.tsx

"use client"

import { CompletionRing } from "@/components/shared/completion-ring"
import { cn } from "@/lib/utils"

interface BoardQuestion {
  id: string
  text: string
  label: string
  areaHint: string
  tier: string
  allowDefer: boolean
  required: boolean
}

interface QuestionBoardProps {
  title: string                          // "Initial Questions", "Follow-up Questions", etc.
  questions: BoardQuestion[]
  answeredIds: Set<string>
  answers: Record<string, string>        // for showing answer snippets
  completenessScore: number
  onQuestionTap: (question: BoardQuestion) => void
  onDeferAll?: () => void                // only for tier2
  isSubmitting: boolean
  removedIds?: string[]                  // for fade-out animation
  className?: string
}

export function QuestionBoard({
  title, questions, answeredIds, answers, completenessScore,
  onQuestionTap, onDeferAll, isSubmitting, removedIds = [], className,
}: QuestionBoardProps) {

  return (
    <div className={cn("flex flex-col min-h-screen", className)}>

      {/* ── HEADER ── */}
      <div className="w-full bg-[#0A3D40] px-5 py-4 text-white
                      md:mx-auto md:max-w-lg md:rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-sm text-white/60 mt-0.5">
              {questions.length - answeredIds.size} question{questions.length - answeredIds.size !== 1 ? "s" : ""} remaining
            </p>
          </div>
          <CompletionRing
            percent={completenessScore}
            size={52}
            strokeWidth={4}
            showLabel
          />
        </div>
      </div>

      {/* ── QUESTION CARDS ── */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-32
                      md:mx-auto md:max-w-lg md:w-full">

        {questions.map((q) => {
          const isAnswered = answeredIds.has(q.id)
          const isRemoved = removedIds.includes(q.id)
          const snippet = answers[q.id]
            ? answers[q.id].slice(0, 80) + (answers[q.id].length > 80 ? "..." : "")
            : null

          return (
            <button
              key={q.id}
              onClick={() => !isSubmitting && onQuestionTap(q)}
              disabled={isSubmitting}
              className={cn(
                "w-full text-left rounded-xl border p-4 transition-all duration-300",
                "min-h-16 flex items-start gap-3",
                isRemoved && "opacity-0 scale-95 h-0 p-0 border-0 overflow-hidden",
                isAnswered
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-white border-gray-200 hover:border-[#0D7377] hover:shadow-sm",
                isSubmitting && "opacity-60 cursor-wait"
              )}
            >
              {/* Status indicator */}
              <div className={cn(
                "mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                isAnswered
                  ? "bg-emerald-500 text-white"
                  : "border-2 border-gray-300"
              )}>
                {isAnswered && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Question content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium leading-snug",
                  isAnswered ? "text-emerald-900" : "text-[#1E2B2C]"
                )}>
                  {q.text}
                </p>
                <p className="text-xs text-[#5A7070] mt-1">{q.areaHint}</p>
                {snippet && (
                  <p className="text-xs text-emerald-700 mt-1.5 italic line-clamp-2">
                    "{snippet}"
                  </p>
                )}
              </div>

              {/* Tap arrow */}
              {!isAnswered && (
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* ── BOTTOM BAR ── */}
      {onDeferAll && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200
                       px-4 py-3 md:mx-auto md:max-w-lg">
          <button
            onClick={onDeferAll}
            disabled={isSubmitting}
            className="w-full py-3 text-center text-[#0D7377] font-semibold
                      border-2 border-[#0D7377] rounded-xl
                      hover:bg-[#EEF8F8] transition-colors"
          >
            Answer Later — save and continue on your shift
          </button>
        </div>
      )}
    </div>
  )
}

Then MODIFY app/staff/report/page.tsx to use this component:
- In the tier1_board phase: render <QuestionBoard title="Initial Questions" ... />
- In the tier2_board phase: render <QuestionBoard title="Follow-up Questions" onDeferAll={handleDeferAll} ... />
- In the closing phase: render <QuestionBoard title="Closing Questions" ... />

Map the QuestionBoard callbacks:
  onQuestionTap → openQuestion (sets activeQuestion + phase to "answering")
  onDeferAll → handleDeferAll (calls __DEFER_ALL__ API)

Run npm run build. Fix all TypeScript errors.
Test at 375px width: all cards visible, no horizontal overflow.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_IR1/task-IR-1g-DONE.md`

---
---

# Task IR-1h — Delete Old Routes + Verification Rollup
## Phase: IR-1 — Incident Reporting Frontend + Backend Wiring
## Estimated Time: 1–2 hours
## Depends On: IR-1g complete (full flow verified working)

---

## Why This Task Exists

Six old agent routes are now replaced by three new routes. This task
verifies the complete flow works end-to-end, then deletes the old
routes. It also verifies no other part of the codebase references
the deleted routes.

---

## What This Task Deletes

```
app/api/agent/report/route.ts
app/api/agent/report-conversational/route.ts
app/api/agent/interview/start/route.ts
app/api/agent/interview/answer/route.ts
app/api/agent/interview/complete/route.ts
app/api/agent/investigate/route.ts
```

---

## Pre-Deletion Verification

Before deleting anything, run this complete end-to-end test:

```
FULL JOURNEY TEST — Maria Torres reports a fall

1. POST /api/report/start
   Body: { incidentType: "fall", residentName: "Margaret Chen",
           residentRoom: "102", location: "Room 102 — beside bed",
           incidentDate: "2026-04-28", incidentTime: "06:15", hasInjury: null }
   ✓ Returns sessionId + 5 Tier 1 questions

2. POST /api/report/answer — Tier 1 Q1 (narrative)
   Body: { sessionId, questionId: "t1-q1", transcript: "I found Margaret...",
           tier: "tier1", activeMs: 45000 }
   ✓ Returns tier1_updated

3. POST /api/report/answer — Tier 1 Q2 through Q4
   ✓ Each returns tier1_updated

4. POST /api/report/answer — Tier 1 Q5 (final)
   ✓ Returns gap_analysis_complete with tier2Questions

5. POST /api/report/answer — Tier 2 Q1
   ✓ Returns tier2_updated with questionsRemoved and remainingQuestions

6. POST /api/report/answer — several more Tier 2 answers
   ✓ completenessScore increases
   ✓ When threshold reached: returns closing_ready

7. POST /api/report/answer — Closing Q1, Q2, Q3
   ✓ Final returns allClosingComplete: true

8. POST /api/report/complete
   ✓ Returns report card
   ✓ MongoDB incident has phase: "phase_1_complete"
   ✓ Redis session deleted
   ✓ Notification created for DON/admin
```

---

## Deletion Process

```
ONLY AFTER the full journey test passes:

1. Search for references to deleted routes:
   grep -r "agent/report\|agent/interview\|agent/investigate" \
     --include="*.ts" --include="*.tsx" -l

2. For each file found: update the reference to use the new routes
   OR verify it is in the files being deleted

3. Delete the six files listed above

4. Run npm run build — must pass with zero errors

5. Run npm run test — must pass

6. Verify no broken imports or dead references remain
```

---

## Success Criteria

- [ ] Full journey test passes (8 steps above)
- [ ] All six old route files deleted
- [ ] `npm run build` passes after deletion
- [ ] No remaining references to deleted routes in codebase
- [ ] `/api/report/start` works
- [ ] `/api/report/answer` works for tier1, tier2, closing, __DEFER_ALL__
- [ ] `/api/report/complete` works and returns report card

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am cleaning up old agent routes from WAiK. The new incident reporting
routes (/api/report/start, /api/report/answer, /api/report/complete) are
complete and working. The old routes need to be deleted.

STEP 1: Search for all references to the old routes

grep -r "agent/report\|agent/interview\|agent/investigate\|report-conversational" \
  --include="*.ts" --include="*.tsx" -l

For each file found:
- If it is one of the six files being deleted: note it for deletion
- If it is a different file: update any fetch() or import references
  to use the new /api/report/* routes instead
- If it is a test file: update the test to use new routes

STEP 2: Delete these files

rm app/api/agent/report/route.ts
rm app/api/agent/report-conversational/route.ts
rm app/api/agent/interview/start/route.ts
rm app/api/agent/interview/answer/route.ts
rm app/api/agent/interview/complete/route.ts
rm app/api/agent/investigate/route.ts

STEP 3: Check if the agent/report and agent/interview directories
are now empty. If so, delete the empty directories.

STEP 4: Run npm run build. Fix any broken imports.

STEP 5: Verify the new routes still work by checking that the route
files exist and export POST functions:
- app/api/report/start/route.ts
- app/api/report/answer/route.ts
- app/api/report/complete/route.ts

DO NOT delete any files in lib/agents/expert_investigator/.
Those are the intelligence pipeline and they stay.

DO NOT delete lib/agents/report_agent.ts or
lib/agents/investigation_agent.ts yet — they may be referenced
by other parts of the system. Only delete the route files.
```

---

## Phase IR-1 Epic Complete Marker

After this task passes, create `plan/pilot_1/phase_IR1/EPIC-DONE.md`:

```markdown
# Phase IR-1 — Incident Reporting Frontend + Backend Wiring — COMPLETE

## Tasks Completed
- [x] IR-1a — POST /api/report/start + Tier 1 config + ReportSession
- [x] IR-1b — POST /api/report/answer — Tier 1 logic
- [x] IR-1c — POST /api/report/answer — Tier 2 (expert investigator)
- [x] IR-1d — POST /api/report/answer — closing + deferral
- [x] IR-1e — POST /api/report/complete — sign-off + clinical record
- [x] IR-1f — Wire report page to real API calls
- [x] IR-1g — Data-driven question board component
- [x] IR-1h — Delete old routes + verification

## New Files Created
- lib/config/tier1-questions.ts
- lib/config/report-session.ts
- app/api/report/start/route.ts
- app/api/report/answer/route.ts
- app/api/report/complete/route.ts
- lib/agents/clinical-record-generator.ts
- components/staff/question-board.tsx

## Files Deleted
- app/api/agent/report/route.ts
- app/api/agent/report-conversational/route.ts
- app/api/agent/interview/start/route.ts
- app/api/agent/interview/answer/route.ts
- app/api/agent/interview/complete/route.ts
- app/api/agent/investigate/route.ts

## What Comes Next
Phase IR-2 — Intelligence Pipeline
Phase IR-3 — Analytics + Data Strategy
```
