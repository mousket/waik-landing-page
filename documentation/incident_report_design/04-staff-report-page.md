## `app/staff/report/page.tsx` — current state mapping

This doc captures the **current implementation** of the staff incident report page, focusing on:

- state variables (`useState`)
- the phase/step enum in use
- how transitions occur
- what API calls are made (and to which routes)
- how voice input is handled
- what happens on submit/defer/back
- whether `VoiceInputScreen` is imported/used
- whether the task-03e `ReportPhase` state machine exists here

---

## State variables (`useState`)

Declared in `StaffReportPage()`:

- **`phase`**: `ReportPhase` (default `"type_select"`)
- **`selectedTypeKey`**: `string | null`
- **`selectedResident`**: `StaffResidentSearchOption | null`
- **`activeQuestion`**: `ActiveQuestion | null`
- **`answers`**: `Record<string, string>` (maps `question.id` → transcript or `"__DEFERRED__"`)
- **`incidentId`**: `string | null`
- **`sessionId`**: `string | null` (currently not populated; always set to `null` on draft create)
- **`completionPercent`**: `number` (derived from `answers` via `completionFromAnswers`)
- **`isCreating`**: `boolean` (draft incident creation in progress)

Derived state:

- `useEffect([answers])` recomputes `completionPercent`.

---

## Phase/step enum (task-03e)

This file defines and uses:

```ts
export type ReportPhase =
  | "type_select"
  | "resident_splash"
  | "tier1_board"
  | "answering"
  | "gap_analysis"
  | "tier2_board"
  | "closing"
  | "signoff"
  | "reportcard"
```

So **yes**: the `ReportPhase` state machine from task-03e is present **as a TS union type + `phase` state + a `switch` renderer**.

---

## How the page transitions between steps

All transitions are via `setPhase(...)`. The routing logic is centralized in `renderPhase()` (a `switch (phase)`).

### Transition map

- **`type_select`**
  - clicking an incident type → `handleTypeSelect(typeKey)` sets:
    - `selectedTypeKey = typeKey`
    - `selectedResident = null`
    - `phase = "resident_splash"`

- **`resident_splash`**
  - Back button → `handleBackFromResident()` sets:
    - `selectedResident = null`
    - `selectedTypeKey = null`
    - `phase = "type_select"`
  - Start report → `createDraftIncident()` (async) sets:
    - on success: `incidentId = <created id>`, `sessionId = null`, `phase = "tier1_board"`
    - on offline queue: `incidentId = null`, `sessionId = null`, `phase = "tier1_board"`

- **`tier1_board`**
  - “Answer first question” → `openQuestion(TIER1_SAMPLE)` sets:
    - `activeQuestion = TIER1_SAMPLE`
    - `phase = "answering"`
  - “All Tier 1 answered (next step)” → `setPhase("gap_analysis")`

- **`gap_analysis`**
  - **Simulated**: `useEffect` watches `phase === "gap_analysis"` and after 2s:
    - `phase = "tier2_board"`

- **`tier2_board`**
  - “Answer next question” → `openQuestion(TIER2_SAMPLE)` → `phase = "answering"`
  - “Met threshold (next: closing)” → `setPhase("closing")`

- **`closing`**
  - “Answer closing question” → `openQuestion(CLOSING_SAMPLE)` → `phase = "answering"`
  - “All 3 closing answered (dev)” → `setPhase("signoff")`

- **`answering`**
  - Rendered only when `activeQuestion` is non-null.
  - Back → `onBack` calls `returnToBoard(activeQuestion.tier)` which sets:
    - `activeQuestion = null`
    - tier-dependent phase:
      - `tier1` → `"tier1_board"`
      - `tier2` → `"tier2_board"`
      - `closing` → `"closing"`
  - Submit → `onSubmit(transcript)` calls `handleAnswer(activeQuestion, transcript)`:
    - `answers[question.id] = transcript.trim()`
    - then `returnToBoard(question.tier)`
  - Defer (tier2 only; if `allowDefer`) → `handleDefer(activeQuestion)`:
    - `answers[question.id] = "__DEFERRED__"`
    - `activeQuestion = null`
    - `phase = "tier2_board"`

- **`signoff`**
  - “Continue to report card” → `setPhase("reportcard")`

- **`reportcard`**
  - “Finish and return to dashboard” → `handleFinishDashboard()`:
    - navigates to `/admin/dashboard` if `role === "admin"`, else `/staff/dashboard`

### Reset behavior

The whole page is wrapped in `ErrorBoundary onReset={resetToSplash}`. `resetToSplash()` clears:

- `phase` → `"type_select"`
- `selectedTypeKey`/`selectedResident`/`activeQuestion` → `null`
- `answers` → `{}`
- `incidentId`/`sessionId` → `null`
- `completionPercent` → `0`

---

## API calls and routes

This page makes **one** network call path:

- **`postIncidentOrQueue(payload)`** from `@/lib/offline-queue`
  - Called by `createDraftIncident()`
  - The payload includes: `title`, `description`, `residentId`, `residentName`, `residentRoom`, `staffId`, `staffName`, `reportedByRole`, `priority`.

Important: `app/staff/report/page.tsx` itself does **not** call `fetch("/api/...")` directly for report creation; it delegates to `postIncidentOrQueue`. The actual route is determined inside `lib/offline-queue` (not in this file).

No other API calls are made for:

- submitting answers
- gap analysis
- generating tier2 questions
- signoff

Those are currently **stubbed/simulated** UI flows here.

---

## Voice input handling

### Is `VoiceInputScreen` imported and used?

**Yes**.

- Imported: `import VoiceInputScreen, { type VoiceInputScreenProps } from "@/components/voice-input-screen"`
- Used in `"answering"` phase: `return <VoiceInputScreen {...vi} />`

### How it is wired

When in `"answering"` phase, the page builds `VoiceInputScreenProps`:

- `question`: `activeQuestion.text`
- `questionLabel`: `activeQuestion.label`
- `areaHint`: `activeQuestion.areaHint`
- `initialTranscript`: `answers[activeQuestion.id]`
- `allowDefer`: from question
- `showEncouragement`: `activeQuestion.tier === "tier2"`
- `completionRingPercent`: derived from `answers`
- `onSubmit(transcript)`:
  - saves trimmed transcript into `answers[question.id]`
  - transitions back to the board for that tier
- `onDefer`:
  - only provided if `allowDefer === true`
  - writes `"__DEFERRED__"` and returns to tier2 board
- `onBack` returns to the board for that tier without changing answers

### What happens when the user submits an answer

Submit is **client-local**:

- no API call
- transcript stored in React state (`answers`)
- transition back to the question board

So: **answers are not persisted** from this page yet (beyond the initial “draft incident” creation).

---

## Is the task-03e ReportPhase state machine implemented?

**Partially**.

What exists:

- `ReportPhase` union type exported from this module
- `phase` state + `renderPhase()` switch
- deterministic transitions via `setPhase(...)`
- simulation for `gap_analysis` → `tier2_board` via a timeout effect
- voice input screen integration in `"answering"`

What does not exist (yet) in this file:

- real tier1/tier2 question board driven by backend questions
- a real “gap analysis” API call
- persisting each answer to the backend (question/answer endpoints)
- a real signoff submission
- use of `sessionId` for a live backend session (it’s always set to `null` here)

