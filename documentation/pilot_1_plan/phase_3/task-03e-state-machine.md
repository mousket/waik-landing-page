# Task 03e — Staff Report State Machine + ErrorBoundary Integration
## Phase: 2 — Core Hardening
## Estimated Time: 2–3 hours
## Depends On: task-03d (VoiceInputScreen and ErrorBoundary must exist)

---

## Why This Task Exists

The staff report page (`app/staff/report/page.tsx`) currently implements
a sequential question model — WAiK asks one question, nurse answers, WAiK
asks the next. That model was replaced in the co-founder meetings. The
agreed model is a question board: questions appear as a list, the nurse
taps one, answers it on VoiceInputScreen, and returns to the updated board.

This task refactors the report page to the new state machine model. It does
not build the question board UI — that is task-04b. What it builds is the
state machine that the question board will slot into, with a placeholder
where the board will live, and the VoiceInputScreen correctly wired as the
answering screen.

After this task, the report flow has the right shape. task-04b fills in
the board. task-05 wires real data. The architecture is clean.

The ErrorBoundary from task-03d is also integrated here — wrapping the
report page so a crashing agent shows a recovery UI instead of a blank page.

---

## Context Files

- `app/staff/report/page.tsx` — refactor target
- `app/staff/report/[[...type]]/page.tsx` — may exist with routing params
- `components/voice-input-screen.tsx` — built in task-03d
- `components/error-boundary.tsx` — built in task-03d
- `lib/auth.ts` — getCurrentUser() for facilityId and userId

---

## State Machine Definition

```typescript
type ReportPhase =
  | "splash"          // incident type + resident selection
  | "tier1_board"     // Tier 1 question list (placeholder in this task)
  | "answering"       // VoiceInputScreen open for one question
  | "gap_analysis"    // loading — AI running between Tier 1 and Tier 2
  | "tier2_board"     // Tier 2 question list (placeholder in this task)
  | "closing"         // 3 closing questions (placeholder in this task)
  | "signoff"         // review and sign
  | "reportcard"      // score and coaching

type ActiveQuestion = {
  id: string
  text: string
  label: string       // "Q1", "Q2", "Tier 2", "Closing", etc.
  areaHint?: string
  tier: "tier1" | "tier2" | "closing"
  allowDefer: boolean
}
```

Transitions:
```
splash      → tier1_board   (on incident created)
tier1_board → answering     (on question tapped)
answering   → tier1_board   (on Done, if tier1 question)
answering   → tier2_board   (on Done, if tier2 question)
answering   → closing       (on Done, if closing question)
tier1_board → gap_analysis  (on all tier1 answered)
gap_analysis → tier2_board  (on AI complete)
tier2_board → closing       (on threshold met)
tier2_board → tier1_board   (on Answer Later — back to dashboard actually)
closing     → signoff       (on all 3 closing answered)
signoff     → reportcard    (on signed)
```

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] `app/staff/report/page.tsx` uses ReportPhase state machine
- [ ] Phase "splash" renders incident type selection
- [ ] Phase "tier1_board" renders placeholder: "Question board renders here (task-04b)"
  and a single "Answer first question" button
- [ ] Phase "answering" renders VoiceInputScreen with correct props
- [ ] Phase "gap_analysis" renders loading indicator
- [ ] Phase "tier2_board" renders placeholder with "Answer next question" button
- [ ] Phase "closing" renders placeholder with "Answer closing question" button
- [ ] Phase "signoff" renders placeholder
- [ ] Phase "reportcard" renders placeholder
- [ ] VoiceInputScreen onSubmit transitions back to correct board phase
- [ ] VoiceInputScreen onBack transitions back to correct board phase without saving
- [ ] VoiceInputScreen onDefer transitions back to tier2_board (deferred state)
- [ ] ErrorBoundary wraps the entire page content
- [ ] ErrorBoundary onReset resets to "splash" phase
- [ ] Sequential question model completely removed from page
- [ ] No console errors when navigating through all phases

---

## Test Cases

```
TEST 1 — Page loads in splash phase
  Action: Navigate to /staff/report
  Expected: Incident type selection visible (splash phase)
            No VoiceInputScreen visible
  Pass/Fail: ___

TEST 2 — Answering phase shows VoiceInputScreen
  Action: Set state to answering phase with a question loaded
  Expected: VoiceInputScreen renders with question text visible
  Pass/Fail: ___

TEST 3 — Done on tier1 question returns to tier1 board
  Action: In answering phase (tier1 question), click Done with transcript
  Expected: Phase transitions to tier1_board
            Answer saved in local state
  Pass/Fail: ___

TEST 4 — Done on tier2 question returns to tier2 board
  Action: In answering phase (tier2 question), click Done with transcript
  Expected: Phase transitions to tier2_board
  Pass/Fail: ___

TEST 5 — Defer on tier2 question returns to tier2 board
  Action: In answering phase (tier2 question), click Answer Later
  Expected: Phase transitions to tier2_board
            Question marked as deferred in local state
  Pass/Fail: ___

TEST 6 — Back without answer returns without saving
  Action: In answering phase, click back arrow without typing
  Expected: Phase transitions back to board. No answer saved.
  Pass/Fail: ___

TEST 7 — Gap analysis placeholder renders
  Action: Set phase to gap_analysis
  Expected: Loading indicator visible
            "WAiK is analyzing your report..." text or spinner
  Pass/Fail: ___

TEST 8 — ErrorBoundary catches crash and resets
  Action: Simulate child component throwing an error
  Expected: "Something went wrong. Your progress has been saved." visible
            "Tap here to restart" button visible
  Action: Click restart
  Expected: Phase resets to "splash"
  Pass/Fail: ___

TEST 9 — No sequential question model remaining
  Action: Search for "conversational" or sequential Q&A patterns in the page
  Expected: No sequential flow code remains — only the state machine
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm refactoring app/staff/report/page.tsx from a sequential question
model to a state machine that supports the question board interaction
model. The VoiceInputScreen and ErrorBoundary components already exist
from task-03d.

STEP 1 — STATE MACHINE SETUP

At the top of the page component (this is a "use client" component):

  type ReportPhase =
    | "splash" | "tier1_board" | "answering" | "gap_analysis"
    | "tier2_board" | "closing" | "signoff" | "reportcard"

  type ActiveQuestion = {
    id: string
    text: string
    label: string
    areaHint?: string
    tier: "tier1" | "tier2" | "closing"
    allowDefer: boolean
  }

  const [phase, setPhase] = useState<ReportPhase>("splash")
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [completionPercent, setCompletionPercent] = useState(0)

STEP 2 — PHASE RENDERERS

Replace the entire return statement with a switch on phase:

  // Wrap everything in ErrorBoundary first:
  return (
    <ErrorBoundary onReset={() => { setPhase("splash"); setAnswers({}) }}>
      <div className="min-h-screen bg-light-bg">
        {renderPhase()}
      </div>
    </ErrorBoundary>
  )

  function renderPhase() {
    switch (phase) {
      case "splash":
        return <SplashScreen onStart={handleStart} />
      
      case "tier1_board":
        return (
          <div className="p-4">
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
              <p className="text-dark-teal font-semibold mb-2">Tier 1 Question Board</p>
              <p className="text-muted text-sm mb-4">
                Question board UI renders here — implemented in task-04b
              </p>
              <button
                onClick={() => openQuestion({
                  id: "q1", text: "Tell us what happened.", label: "Q1",
                  tier: "tier1", allowDefer: false
                })}
                className="bg-teal text-white px-6 py-3 rounded-xl"
              >
                Answer first question
              </button>
            </div>
          </div>
        )
      
      case "answering":
        if (!activeQuestion) return null
        return (
          <VoiceInputScreen
            question={activeQuestion.text}
            questionLabel={activeQuestion.label}
            areaHint={activeQuestion.areaHint}
            initialTranscript={answers[activeQuestion.id]}
            allowDefer={activeQuestion.allowDefer}
            showEncouragement={activeQuestion.tier === "tier2"}
            completionRingPercent={completionPercent}
            onSubmit={(transcript) => handleAnswer(activeQuestion, transcript)}
            onDefer={() => handleDefer(activeQuestion)}
            onBack={() => returnToBoard(activeQuestion.tier)}
          />
        )
      
      case "gap_analysis":
        return (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <p className="text-dark-teal font-semibold text-lg mb-2">WAiK</p>
            <p className="text-muted text-sm">Analyzing your report...</p>
            {/* Animated loading dots or spinner */}
          </div>
        )
      
      case "tier2_board":
        return (
          <div className="p-4">
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
              <p className="text-dark-teal font-semibold mb-2">Tier 2 Question Board</p>
              <p className="text-muted text-sm mb-4">
                Gap-fill questions render here — implemented in task-04b
              </p>
              <button
                onClick={() => openQuestion({
                  id: "t2-q1", text: "Describe the lighting conditions.",
                  label: "Tier 2", areaHint: "Environment",
                  tier: "tier2", allowDefer: true
                })}
                className="bg-teal text-white px-6 py-3 rounded-xl"
              >
                Answer next question
              </button>
            </div>
          </div>
        )
      
      case "closing":
        return (
          <div className="p-4">
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
              <p className="text-dark-teal font-semibold mb-2">Closing Questions</p>
              <p className="text-muted text-sm mb-4">
                Closing question board renders here — implemented in task-04b
              </p>
              <button
                onClick={() => openQuestion({
                  id: "c1", text: "What immediate interventions did you put in place?",
                  label: "Closing", tier: "closing", allowDefer: false
                })}
                className="bg-teal text-white px-6 py-3 rounded-xl"
              >
                Answer closing question
              </button>
            </div>
          </div>
        )
      
      case "signoff":
        return (
          <div className="p-4 text-center">
            <p className="text-dark-teal font-semibold">Sign-Off — implemented in later task</p>
          </div>
        )
      
      case "reportcard":
        return (
          <div className="p-4 text-center">
            <p className="text-dark-teal font-semibold">Report Card — implemented in task-13</p>
          </div>
        )
    }
  }

STEP 3 — STATE MACHINE TRANSITION HANDLERS

  function openQuestion(question: ActiveQuestion) {
    setActiveQuestion(question)
    setPhase("answering")
  }
  
  function handleAnswer(question: ActiveQuestion, transcript: string) {
    setAnswers(prev => ({ ...prev, [question.id]: transcript }))
    returnToBoard(question.tier)
  }
  
  function handleDefer(question: ActiveQuestion) {
    // Mark as deferred — will show in tier2 board with deferred badge
    setAnswers(prev => ({ ...prev, [question.id]: "__DEFERRED__" }))
    setPhase("tier2_board")
  }
  
  function returnToBoard(tier: "tier1" | "tier2" | "closing") {
    setActiveQuestion(null)
    if (tier === "tier1") setPhase("tier1_board")
    else if (tier === "tier2") setPhase("tier2_board")
    else setPhase("closing")
  }
  
  function handleStart(newIncidentId: string, newSessionId: string) {
    setIncidentId(newIncidentId)
    setSessionId(newSessionId)
    setPhase("tier1_board")
  }

STEP 4 — REMOVE SEQUENTIAL MODEL

Delete or comment out all code from the old sequential question flow.
This includes:
  - Any state variables like currentQuestion, conversationHistory
  - Any functions like handleNextQuestion, askQuestion
  - Any rendering of sequential question UI

Keep: incident type selection logic, resident search, any existing
API call logic that can be reused in the new model.

STEP 5 — SPLASH SCREEN COMPONENT (inline or separate file)

SplashScreen is the incident type selection from Screen 1 of the UI spec.
For now: a simple grid of tappable incident type cards.
On card tap: create incident via POST /api/incidents, get back incidentId,
call onStart(incidentId, sessionId).

If this already exists in the page: extract it cleanly.
If it does not exist: create a minimal version with these types:
  Fall Incident | Medication Error | Resident Conflict | Wound or Injury

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/04-AGENTIC-ARCHITECTURE.md` — state machine
- Create `plan/pilot_1/phase_2/task-03e-DONE.md`
