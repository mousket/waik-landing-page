# Task 03 — Fix Critical Production Bugs + Question Board Foundation
## Phase: 2 — Core Hardening
## Estimated Time: 5–6 hours
## Depends On: task-01, task-02

---

## Why This Task Exists

This task has two distinct responsibilities that must both be complete before
any UI work begins.

The first is survival. Three production bugs will destroy the pilot on day one.
The session store bug means the conversational investigation — the entire core
product feature — is silently broken in production right now. The timeout bug
means reports fail mid-sentence on a real phone. The iOS voice bug means the
screen dims and the app stops listening every 10 seconds.

The second is architecture. The current voice report page (`app/staff/report/page.tsx`)
implements a sequential question model — WAiK asks one question, the nurse answers,
WAiK asks the next. That model was replaced in the co-founder meetings. The agreed
model is a question board: questions appear simultaneously as a list, the nurse
chooses which to answer, she taps it, answers on a dedicated input screen, and
returns to the updated board. This is the interaction model specified in
UI Specification Screen 3, 4, and 5 (Pass 1). The Voice Input Screen (Screen 4)
is the single shared component used for every question answer across Tier 1,
Tier 2, and Phase 2 IDT responses.

This task builds the Voice Input Screen as a standalone reusable component and
updates the report page to use it. The Question Board component itself is built
in task-04b. This task only builds the input screen that the board navigates to.

---

## Context Files

- `lib/agents/expert_investigator/session_store.ts` — replace Map with Redis
- `app/api/agent/report-conversational/route.ts` — add maxDuration + timeout
- `app/staff/report/page.tsx` — refactor to board model, remove sequential flow
- `components/voice-input-screen.tsx` — CREATE THIS (new reusable component)
- `components/error-boundary.tsx` — CREATE THIS

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] Session store uses Redis — key `waik:session:{sessionId}` — 2hr TTL
- [ ] Session survives across separate API calls (Vercel serverless safe)
- [ ] Timeout after 45s returns `{ status: "partial" }` not a 504
- [ ] `export const maxDuration = 60` on report-conversational route
- [ ] iOS Wake Lock activates when voice recording starts
- [ ] Screen unlock restarts listening after 1-second delay
- [ ] Textarea fallback appears after 2 consecutive no-speech errors
- [ ] Textarea answer submits correctly — same handler as voice
- [ ] `components/voice-input-screen.tsx` exists and accepts props (see spec below)
- [ ] Voice input screen shows question text at top
- [ ] Voice input screen shows real-time transcription as nurse speaks
- [ ] Voice input screen has Record, Pause, and Clear buttons
- [ ] Voice input screen has text input fallback always visible
- [ ] Voice input screen has Done button (active when transcript ≥ 10 chars)
- [ ] Voice input screen has optional Answer Later link (hidden for Tier 1)
- [ ] `components/error-boundary.tsx` exists and catches agent crashes
- [ ] App/staff/report/page.tsx no longer uses sequential question flow

---

## Test Cases

```
TEST 1 — Redis session survives across API calls
  Action: POST /api/agent/interview/start → get sessionId.
          Wait 5 seconds.
          POST /api/agent/interview/answer with same sessionId.
  Expected: Second call retrieves correct session state.
  Pass/Fail: ___

TEST 2 — Session TTL correct
  Action: Create session. In Redis CLI: TTL waik:session:{sessionId}
  Expected: ~7200 (2 hours)
  Pass/Fail: ___

TEST 3 — Timeout returns partial not 504
  Action: Mock LLM calls to take 46 seconds
  Expected: { status: "partial", message: "..." } with HTTP 200
  Pass/Fail: ___

TEST 4 — iOS Wake Lock activates
  Action: On iPhone, open voice input screen and tap Record
  Expected: Screen does not auto-dim while recording
  Pass/Fail: ___

TEST 5 — Text fallback appears after 2 voice failures
  Action: Trigger 2 consecutive no-speech errors on voice input screen
  Expected: Textarea visible below mic button
  Pass/Fail: ___

TEST 6 — Text fallback submits via same handler
  Action: Type answer in textarea, tap Submit
  Expected: Answer processed identically to voice answer
  Pass/Fail: ___

TEST 7 — VoiceInputScreen renders with question prop
  Action: Render <VoiceInputScreen question="Test question?" onSubmit={fn} />
  Expected: Question text visible at top of component
  Pass/Fail: ___

TEST 8 — Done button disabled when transcript empty
  Action: Render VoiceInputScreen, do not type or speak
  Expected: Done button is disabled
  Pass/Fail: ___

TEST 9 — Done button enabled at 10+ characters
  Action: Type 10 characters into transcript area
  Expected: Done button becomes active
  Pass/Fail: ___

TEST 10 — Answer Later only shown when allowDefer prop is true
  Action: Render VoiceInputScreen with allowDefer={false}
  Expected: Answer Later link not visible
  Action: Render with allowDefer={true}
  Expected: Answer Later link visible
  Pass/Fail: ___

TEST 11 — ErrorBoundary catches agent crash
  Action: Mock the agent API to throw an unhandled error
  Expected: "Something went wrong. Your progress has been saved." shown instead of blank page
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14 deployed on Vercel. This task fixes critical
production bugs and builds the Voice Input Screen component that the question
board system depends on.

PART A — PRODUCTION BUG FIXES

BUG 1 — In-Memory Session Store (CRITICAL):
lib/agents/expert_investigator/session_store.ts uses a JavaScript Map. On
Vercel serverless, sessions are lost between API calls. This breaks the
conversational investigation entirely.

FIX: Replace with Redis using ioredis.
- Key: "waik:session:{sessionId}" with 2-hour TTL
- Store InvestigatorSession as JSON.stringify / JSON.parse
- Keep exact same exported API: createSession, getSession, updateSession, deleteSession
- REDIS_URL from process.env.REDIS_URL
- If Redis down: throw a descriptive error, do not fall back to memory silently

BUG 2 — Vercel Serverless Timeout:
FIX on /api/agent/report-conversational/route.ts:
- export const maxDuration = 60
- Wrap LLM chain in Promise.race() with 45-second timeout
- On timeout: return { status: "partial", sessionId, incidentId, questions: [],
  message: "Analysis is taking longer than expected. Your report was saved." }

BUG 3 — iOS Voice Interruption:
FIX for any component using Web Speech API:
- navigator.wakeLock?.request('screen') when recording starts, stored in a ref
- Release wake lock when recording stops or component unmounts
- document.addEventListener('visibilitychange'): if visible AND awaitingAnswer,
  restart listening after 1-second delay
- Track consecutiveFailsRef; after 2 no-speech errors: set showTextFallback = true

BUG 4 — Missing Error Boundary:
Create components/error-boundary.tsx as a React class component:
interface Props { children: React.ReactNode; onReset?: () => void }
interface State { hasError: boolean; error?: Error }
On error: show "Something went wrong. Your progress has been saved." with a
"Tap here to restart" button that calls onReset if provided.

PART B — VOICE INPUT SCREEN COMPONENT

Create components/voice-input-screen.tsx as a reusable component.

This component is the single input interface used for:
- Answering Tier 1 questions (Screen 3 → Screen 4 in UI spec)
- Answering Tier 2 questions (Screen 5 → Screen 4)
- Answering closing questions (Screen 7 → Screen 4)
- Answering IDT questions sent by the DON in Phase 2

Props interface:
interface VoiceInputScreenProps {
  question: string                        // the question text to display at top
  questionLabel?: string                  // optional label: "Q1", "Tier 2", etc.
  areaHint?: string                       // optional muted label: "Environment", "Timeline", etc.
  initialTranscript?: string              // pre-populated text for edit sessions
  allowDefer?: boolean                    // show Answer Later link (default false — Tier 1 never shows it)
  showEncouragement?: boolean             // show "feel free to add any other details" note (Tier 2 only)
  onSubmit: (transcript: string) => void  // called when Done is tapped with final text
  onDefer?: () => void                    // called when Answer Later is tapped
  onBack: () => void                      // called when back arrow is tapped
  completionRingPercent?: number          // optional — show ring in top right corner
}

Layout of the component (top to bottom):

1. TOP BAR:
   Left: back arrow button — calls onBack
   Center: questionLabel if provided (e.g. "Q2" or "Tier 2")
   Right: completion ring (circular, teal, shows completionRingPercent if provided)

2. QUESTION DISPLAY:
   Full question text in large readable font (size-lg, font-semibold)
   If areaHint provided: small muted label below: e.g. "Environment & Location"
   If showEncouragement: italic muted note: "Feel free to include any other
   details that come to mind — the more you share, the fewer questions remain."

3. TRANSCRIPT AREA:
   Large scrollable textarea showing the current transcript
   When voice is active: words appear in real time as recognized
   Always directly editable by tapping
   If initialTranscript provided: pre-populated
   Placeholder: "Your answer will appear here as you speak..."

4. VOICE CONTROLS (horizontal row):
   Record button (circular, teal, mic icon):
     - Idle state: solid teal, mic icon, label "Tap to record"
     - Recording state: pulsing animation, stop icon, label "Recording..."
   Pause button: only visible while recording. Tap to pause; changes to Resume.
   Clear button: only visible when transcript has content. Requires confirmation tap.
   
   Apply iOS Wake Lock behavior (BUG 3 fix) to recording state management.

5. TEXT INPUT FALLBACK:
   Always visible below voice controls.
   Textarea with placeholder "Or type your answer here..."
   Text typed here is appended to the transcript area.
   After 2 consecutive no-speech errors: scroll into view and show gentle message:
   "Having trouble with voice? Type your answer below."

6. DONE BUTTON:
   Full-width teal button: "Done — Save this answer"
   Disabled state (gray) when transcript length < 10 characters
   Active state (teal) when transcript length ≥ 10 characters
   When tapped: calls onSubmit(transcript)
   If transcript is 10-30 characters: show amber note below:
   "This answer is brief — more detail makes for a stronger report."

7. ANSWER LATER LINK (conditional — only when allowDefer is true):
   Small text link below Done button: "I cannot answer this right now — save for later"
   Tapping calls onDefer()

PART C — UPDATE APP/STAFF/REPORT/PAGE.TSX

The current page uses a sequential question flow. Replace it with a state machine
that supports the question board model:

New state shape:
type ReportPhase = 'splash' | 'tier1_board' | 'answering' | 'gap_analysis' | 'tier2_board' | 'closing' | 'signoff' | 'reportcard'

When phase === 'answering':
  - The selected question is passed to <VoiceInputScreen />
  - When VoiceInputScreen calls onSubmit: save answer, return to board phase
  - When VoiceInputScreen calls onBack: return to board without saving
  - When VoiceInputScreen calls onDefer (Tier 2 only): mark question deferred, return to board

The board phases (tier1_board, tier2_board, closing) render a question list.
The question list and board UI will be built in task-04b.
For now: render a placeholder card in board phases that says
"Question board renders here — implement in task-04b"
and a single "Answer first question" button that sets phase to 'answering'
with the first unanswered question.

This allows task-04b to slot in cleanly without touching the state machine.

Wrap the entire return of app/staff/report/page.tsx in <ErrorBoundary>.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/04-AGENTIC-ARCHITECTURE.md` — note Redis session store
- Update `documentation/waik/07-EXPERT-INVESTIGATOR.md` — session management section
- Add `components/voice-input-screen.tsx` to `documentation/waik/08-COMPONENTS.md`
- Create `plan/pilot_1/phase_2/task-03-DONE.md`
