# Task 03d — VoiceInputScreen Component
## Phase: 2 — Core Hardening
## Estimated Time: 3–4 hours
## Depends On: task-03a (Redis done — no direct dependency but sequential)

---

## Why This Task Exists

The VoiceInputScreen is the single component every nurse interacts with
every time she answers a question — Tier 1, Tier 2, closing questions,
and Phase 2 IDT responses. It is the most important UI component in the
entire product.

The current voice report page (`app/staff/report/page.tsx`) runs a
sequential question model that was replaced in the co-founder meetings.
The new model is a question board — the nurse taps a question from a list,
answers it on the VoiceInputScreen, and returns to the board. This task
builds the VoiceInputScreen as a standalone reusable component.

It also fixes the three iOS-specific bugs that will kill the pilot on
day one: the screen dimming mid-recording (Wake Lock), the session dying
when the nurse switches apps (visibility handler), and the repeated
no-speech errors leaving the nurse with no input method (text fallback
auto-reveal).

---

## Context Files

- `app/staff/report/page.tsx` — partial refactor target
- `components/voice-input-screen.tsx` — CREATE THIS
- `components/error-boundary.tsx` — CREATE THIS
- `lib/design-tokens.ts` — WAiK colors from Phase 0.6

---

## Props Interface (frozen — task-03e and task-04b both depend on this)

```typescript
interface VoiceInputScreenProps {
  question: string
  questionLabel?: string          // "Q1", "Tier 2", "Closing", etc.
  areaHint?: string               // "Environment & Location", "Timeline", etc.
  initialTranscript?: string      // pre-populated for edit sessions
  allowDefer?: boolean            // show Answer Later (Tier 2 only — default false)
  showEncouragement?: boolean     // Tier 2 "feel free to include any details" note
  onSubmit: (transcript: string) => void
  onDefer?: () => void
  onBack: () => void
  completionRingPercent?: number
}
```

This interface is locked after this task. Do not change it in later tasks.

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] `components/voice-input-screen.tsx` exists with correct props interface
- [ ] Question text rendered prominently at top
- [ ] questionLabel shown when provided
- [ ] areaHint shown in muted text when provided
- [ ] showEncouragement shows italic note when true
- [ ] initialTranscript pre-populates transcript area when provided
- [ ] Record button activates microphone, shows pulsing animation while active
- [ ] Pause button appears while recording, toggles to Resume
- [ ] Clear button appears when transcript has content, requires confirmation
- [ ] Real-time transcription appears in textarea as nurse speaks
- [ ] Text input fallback always visible below voice controls
- [ ] Text typed in fallback appends to transcript area
- [ ] Done button disabled when transcript < 10 characters
- [ ] Done button active when transcript >= 10 characters
- [ ] Done calls onSubmit(transcript)
- [ ] Answer Later link shown only when allowDefer === true
- [ ] Answer Later calls onDefer()
- [ ] Back arrow calls onBack() with confirmation dialog if transcript not empty
- [ ] Completion ring renders when completionRingPercent provided
- [ ] iOS Wake Lock requested on recording start
- [ ] Wake Lock released on recording stop and component unmount
- [ ] visibilitychange handler restarts listening after 1 second when screen unlocks
- [ ] After 2 consecutive no-speech errors: text fallback scrolls into view
- [ ] `components/error-boundary.tsx` exists as class component
- [ ] ErrorBoundary shows recovery message when child throws

---

## Test Cases

```
TEST 1 — Component renders with question prop
  Action: Render <VoiceInputScreen question="What happened?" onSubmit={fn} onBack={fn} />
  Expected: "What happened?" visible in large text at top
  Pass/Fail: ___

TEST 2 — questionLabel renders when provided
  Action: Render with questionLabel="Q1"
  Expected: "Q1" label visible
  Pass/Fail: ___

TEST 3 — Done disabled when transcript empty
  Action: Render component, do not type or speak
  Expected: Done button is disabled (gray, not clickable)
  Pass/Fail: ___

TEST 4 — Done enabled at 10+ characters
  Action: Type 10 characters in text fallback
  Expected: Done button becomes active (teal)
  Pass/Fail: ___

TEST 5 — Done calls onSubmit with transcript
  Action: Type "Test answer here" in fallback, click Done
  Expected: onSubmit called with "Test answer here"
  Pass/Fail: ___

TEST 6 — Answer Later not shown by default
  Action: Render without allowDefer prop
  Expected: Answer Later link not visible
  Pass/Fail: ___

TEST 7 — Answer Later shown when allowDefer true
  Action: Render with allowDefer={true}, onDefer={fn}
  Expected: Answer Later link visible
  Action: Click Answer Later
  Expected: onDefer() called
  Pass/Fail: ___

TEST 8 — initialTranscript pre-populates
  Action: Render with initialTranscript="Previous answer text"
  Expected: "Previous answer text" visible in transcript area
            Done button is active (>10 chars)
  Pass/Fail: ___

TEST 9 — Text fallback appends to transcript
  Action: Speak "First part" via voice (or mock transcript)
          Then type " second part" in text fallback
  Expected: Transcript area shows "First part second part"
  Pass/Fail: ___

TEST 10 — Back with content shows confirmation
  Action: Type some text, click back arrow
  Expected: Confirmation dialog: "Leave without saving? Your answer will be lost."
            Cancel / Leave options
  Pass/Fail: ___

TEST 11 — ErrorBoundary catches child error
  Action: Render <ErrorBoundary><ComponentThatThrows /></ErrorBoundary>
  Expected: "Something went wrong. Your progress has been saved." visible
            No blank page
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. I need to create the VoiceInputScreen
component — the single input interface used for every question answer
across the entire application. This is a "use client" component.

PART A — CREATE components/voice-input-screen.tsx

Use the exact props interface:
  interface VoiceInputScreenProps {
    question: string
    questionLabel?: string
    areaHint?: string
    initialTranscript?: string
    allowDefer?: boolean
    showEncouragement?: boolean
    onSubmit: (transcript: string) => void
    onDefer?: () => void
    onBack: () => void
    completionRingPercent?: number
  }

LAYOUT (top to bottom, full screen):

1. TOP BAR (flex between, items center, h-14, px-4):
   Left: back arrow button (Lucide ArrowLeft, 24px)
         On click: if transcript.length > 0 → show confirmation dialog
                   else → call onBack() directly
   Center: questionLabel if provided (text-sm, font-medium, text-muted)
   Right: completion ring if completionRingPercent provided
          (circular SVG, 40px, teal stroke, percentage text inside)

2. QUESTION DISPLAY (px-4, py-6):
   Question text: text-lg, font-semibold, text-dark-teal (#0A3D40)
   areaHint: text-sm, text-muted (#5A7070), italic, mt-1
   showEncouragement: text-sm, italic, text-muted, mt-2
     "Feel free to include any other details — the more you share,
      the fewer questions remain."

3. TRANSCRIPT AREA (flex-1, px-4):
   <textarea> full width, min-height 160px, border border-gray-200
   rounded-xl, p-3, text-base, resize-none
   Value: transcript state (string)
   onChange: update transcript state
   Placeholder: "Your answer will appear here as you speak..."
   Pre-populated with initialTranscript if provided

4. VOICE CONTROLS (px-4, py-4, flex gap-3 items-center):
   
   RECORD BUTTON (circular, 64px diameter):
     Idle: bg-teal (#0D7377), white mic icon (Lucide Mic)
     Recording: pulsing animation (CSS: animate-pulse), red background,
                stop icon (Lucide Square)
     On click: toggle recording
   
   PAUSE BUTTON (only visible while isRecording):
     Small teal outline button
     Idle-but-paused: "Resume" label
     Actively recording: "Pause" label
   
   CLEAR BUTTON (only visible when transcript.length > 0):
     Small gray outline button, "Clear" label
     On click: window.confirm("Clear your answer and start over?")
               if confirmed: setTranscript("")

5. TEXT INPUT FALLBACK (px-4, pb-4):
   Always visible (not conditional)
   <textarea> or <input> with placeholder "Or type your answer here..."
   On change: APPEND to transcript (not replace):
     setTranscript(prev => prev + (prev ? " " : "") + e.target.value)
     Then clear this input field
   
   After 2 consecutive no-speech errors: scroll this element into view
   and show message above it: "Having trouble with voice? Type your answer below."
   Track consecutive no-speech errors in a useRef (reset to 0 on successful speech)

6. DONE BUTTON (px-4, pb-4):
   Full width, bg-teal (#0D7377), text-white, rounded-xl, py-4
   Disabled state: bg-gray-300, cursor-not-allowed
   Active state: bg-teal, cursor-pointer
   
   Condition: transcript.trim().length >= 10 → active, else disabled
   
   If transcript.length is 10-30:
     Show amber note below button:
     "This answer is brief — more detail makes for a stronger report."
   
   On click: call onSubmit(transcript.trim())

7. ANSWER LATER LINK (px-4, pb-6 — only when allowDefer === true):
   Small text link: "I cannot answer this right now — save for later"
   color: text-muted, underline
   On click: call onDefer?.()

VOICE RECORDING IMPLEMENTATION:

Use Web Speech API (SpeechRecognition / webkitSpeechRecognition):

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const consecutiveFailsRef = useRef(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const awaitingAnswerRef = useRef(false)  // true while a question is open

  function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setShowTextFallbackPrompt(true)
      return
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    
    recognition.onresult = (event) => {
      consecutiveFailsRef.current = 0
      const interim = Array.from(event.results)
        .map(r => r[0].transcript)
        .join("")
      setTranscript(prev => {
        // Replace interim portion with final — simplified approach:
        // Append final results only
        const finals = Array.from(event.results)
          .filter(r => r.isFinal)
          .map(r => r[0].transcript)
          .join(" ")
        return finals ? finals : prev
      })
    }
    
    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        consecutiveFailsRef.current += 1
        if (consecutiveFailsRef.current >= 2) {
          setShowTextFallbackPrompt(true)
          textFallbackRef.current?.scrollIntoView({ behavior: "smooth" })
        }
      }
    }
    
    recognition.onend = () => {
      if (isRecording && !isPaused) {
        // Restart automatically if still supposed to be recording
        recognition.start()
      }
    }
    
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    awaitingAnswerRef.current = true
    
    // Request Wake Lock to prevent screen dim
    navigator.wakeLock?.request("screen").then(lock => {
      wakeLockRef.current = lock
    }).catch(() => {
      // Wake Lock not available — continue without it
    })
  }
  
  function stopRecording() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsRecording(false)
    wakeLockRef.current?.release()
    wakeLockRef.current = null
  }
  
  // Visibility handler — restart recording after screen unlock
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && awaitingAnswerRef.current && !isRecording) {
        setTimeout(() => startRecording(), 1000)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [isRecording])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

If SpeechRecognition is not available: do not show voice controls.
Show only the text fallback with note: "Voice input is not available
on this device. Please type your answer."

PART B — CREATE components/error-boundary.tsx

Class component:
  interface Props { children: React.ReactNode; onReset?: () => void }
  interface State { hasError: boolean; error?: Error }
  
  class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false }
    
    static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error }
    }
    
    componentDidCatch(error: Error, info: React.ErrorInfo) {
      console.error("[ErrorBoundary] Caught:", error, info)
    }
    
    render() {
      if (this.state.hasError) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-lg font-semibold text-dark-teal mb-2">
              Something went wrong.
            </p>
            <p className="text-muted mb-4">
              Your progress has been saved.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false })
                this.props.onReset?.()
              }}
              className="bg-teal text-white px-6 py-3 rounded-xl"
            >
              Tap here to restart
            </button>
          </div>
        )
      }
      return this.props.children
    }
  }
  
  export default ErrorBoundary

Run npm run build. Fix all TypeScript errors.
Do not modify any route handlers or the report page yet.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Add `components/voice-input-screen.tsx` to `documentation/waik/08-COMPONENTS.md`
- Create `plan/pilot_1/phase_2/task-03d-DONE.md`
