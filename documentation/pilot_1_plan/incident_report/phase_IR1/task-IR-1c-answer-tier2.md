# Task IR-1c — POST /api/report/answer — Tier 2 Logic (Expert Investigator)
## Phase: IR-1 — Incident Reporting Frontend + Backend Wiring
## Estimated Time: 3–4 hours
## Depends On: IR-1b complete (answer route with Tier 1 logic)

---

## Why This Task Exists

This is the intelligence core. When the nurse answers a Tier 2 question,
WAiK re-analyzes the growing narrative against the Gold Standards,
determines which gaps were just filled, removes questions from the board
whose data points are now covered, generates new questions if the answer
revealed previously unknown gaps, and returns the updated board. This is
the loop that makes WAiK fundamentally different from a checkbox form.

---

## What This Task Modifies

1. `app/api/report/answer/route.ts` — add Tier 2 branch to the existing route

---

## Context Files

- `lib/agents/expert_investigator/fill_gaps.ts` — fillGapsWithAnswer (the core function)
- `lib/agents/expert_investigator/gap_questions.ts` — generateGapQuestions (for new questions)
- `lib/agents/expert_investigator/analyze.ts` — reference for AgentState shape
- `lib/config/report-session.ts` — ReportSession, updateReportSession
- `lib/config/tier1-questions.ts` — CLOSING_QUESTIONS
- `blueprint/WAiK_Incident_Reporting_Blueprint.md` — Section 2 + 3

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] POST /api/report/answer with tier: "tier2" calls fillGapsWithAnswer
- [ ] fillGapsWithAnswer receives the current AgentState + answer text
- [ ] Response includes updatedFields (which Gold Standard fields were filled)
- [ ] Response includes questionsRemoved (IDs of implicitly answered questions)
- [ ] Response includes remainingQuestions (current board state)
- [ ] Response includes dataPointsCovered (fields filled by this single answer)
- [ ] Response includes updated completenessScore
- [ ] If new gaps revealed by the answer, new questions appear in response
- [ ] dataPointsPerQuestion array grows in Redis session with each answer
- [ ] When completeness crosses threshold, response includes closingQuestions
- [ ] Questions marked with questionsRemoved actually disappear from the board
- [ ] Re-answering a Tier 2 question overwrites the previous answer and re-analyzes

---

## Test Cases

```
TEST 1 — Answer a Tier 2 question
  Action: POST /api/report/answer
  Body: {
    sessionId: "<from previous flow>",
    questionId: "t2-q1",
    transcript: "Margaret uses a walker. It was folded and leaning against the wall, out of reach. The bed alarm was not activated. Her wheelchair was in the corner.",
    tier: "tier2",
    activeMs: 30000
  }
  Expected: 200 with {
    status: "tier2_updated",
    questionId: "t2-q1",
    updatedFields: ["assistive_device_in_use", "call_light_within_reach", ...],
    questionsRemoved: ["t2-q4"],  // if t2-q4 asked about assistive devices
    newQuestions: [],
    remainingQuestions: [...],     // all unanswered tier2 questions
    completenessScore: <higher than before>,
    thresholdReached: false,
    dataPointsCovered: 3           // this answer covered 3 Gold Standard fields
  }
  Verify: Redis session.tier2Answers["t2-q1"] = transcript
  Verify: Redis session.dataPointsPerQuestion has new entry
  Verify: Redis session.completenessScore increased
  Pass/Fail: ___

TEST 2 — Answer triggers implicit question removal
  Action: Answer a question about the environment that also covers
          the floor conditions question
  Expected: questionsRemoved includes the floor conditions question ID
  Verify: That question no longer appears in remainingQuestions
  Pass/Fail: ___

TEST 3 — Answer reveals new gap
  Action: Nurse mentions "she was taking a new medication" in an
          environment-related answer
  Expected: newQuestions may include a medication-change question
            (if the gap_questions agent determines it is a new gap)
  Pass/Fail: ___

TEST 4 — Threshold reached triggers closing questions
  Action: Answer enough Tier 2 questions that completeness >= 75%
  Expected: {
    status: "closing_ready",
    closingQuestions: [
      { id: "c-q1", text: "What immediate interventions...", ... },
      { id: "c-q2", text: "What do you think are the contributing...", ... },
      { id: "c-q3", text: "What do you recommend...", ... }
    ],
    completenessScore: <number >= 75>
  }
  Verify: Redis session.reportPhase = "closing"
  Pass/Fail: ___

TEST 5 — dataPointsPerQuestion tracking
  Action: Answer 3 Tier 2 questions
  Expected: Redis session.dataPointsPerQuestion has 3 entries
  Each entry: {
    questionId: string,
    questionText: string,
    dataPointsCovered: number (> 0),
    fieldsCovered: string[] (non-empty)
  }
  Pass/Fail: ___

TEST 6 — activeDataCollectionMs accumulates
  Action: Answer with activeMs: 25000, then activeMs: 30000
  Expected: Redis session.activeDataCollectionMs = previous + 25000 + 30000
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am extending the /api/report/answer route to handle Tier 2 answers.
This is the intelligence core — each answer triggers re-analysis
against the Gold Standards.

REFERENCE: Read the architectural blueprint at
plan/pilot_1/blueprint/WAiK_Incident_Reporting_Blueprint.md
Section 2 (tier2_updated response) and Section 3 (On each Tier 2 answer).

ALSO READ: lib/agents/expert_investigator/fill_gaps.ts to understand
the EXACT signature and return type of fillGapsWithAnswer.

═══════════════════════════════════════════════════════════
MODIFY app/api/report/answer/route.ts
═══════════════════════════════════════════════════════════

Add the Tier 2 handler. The route already has the Tier 1 handler
from task IR-1b. Add the following.

1. Import fillGapsWithAnswer from lib/agents/expert_investigator/fill_gaps
2. Import generateGapQuestions from lib/agents/expert_investigator/gap_questions
3. Import CLOSING_QUESTIONS from lib/config/tier1-questions

4. In the POST function, add the tier2 branch:

if (tier === "tier2") {
  return handleTier2Answer(session, questionId, transcript || "", activeMs || 0)
}

5. Implement handleTier2Answer:

async function handleTier2Answer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number
): Promise<Response> {

  // Validate the question exists in tier2Questions
  const question = session.tier2Questions.find(q => q.id === questionId)
  if (!question) {
    return Response.json({ error: `Invalid Tier 2 questionId: ${questionId}` }, { status: 400 })
  }

  // Append transcript to narrative
  const updatedNarrative = session.fullNarrative + "\n\n" + transcript.trim()

  // ── CORE INTELLIGENCE CALL ──
  // Call fillGapsWithAnswer with:
  //   - current AgentState (session.agentState)
  //   - the question ID
  //   - the answer text
  //
  // READ fill_gaps.ts FIRST to see the exact signature.
  // The function likely takes: (state, questionId, answerText, ...)
  // and returns: { state, updatedFields, remainingMissing }
  //
  // ADAPT this call to match the actual signature:

  const fillResult = await fillGapsWithAnswer(
    session.agentState,
    questionId,
    transcript.trim()
    // ... add other params if fill_gaps.ts requires them
  )

  const updatedFields = fillResult.updatedFields || []
  const remainingMissing = fillResult.remainingMissing || []

  // Compute new completeness score
  // The AgentState should have a way to compute this.
  // Check if fillResult returns a score directly or if
  // you need to compute it from the state.
  const newCompleteness = fillResult.state?.completenessScore ??
    computeCompletenessFromState(fillResult.state)

  // Record dataPointsPerQuestion entry
  const dpEntry = {
    questionId,
    questionText: question.text,
    dataPointsCovered: updatedFields.length,
    fieldsCovered: updatedFields,
  }

  // Determine which existing questions are now implicitly answered
  // A question is implicitly answered if ALL of its targetFields
  // are now filled in the Gold Standard state.
  const questionsRemoved: string[] = []
  const currentTier2 = session.tier2Questions.filter(
    q => q.id !== questionId && !session.tier2Answers[q.id]
  )

  for (const q of currentTier2) {
    if (q.targetFields && q.targetFields.length > 0) {
      const allCovered = q.targetFields.every(
        (field: string) => !remainingMissing.includes(field)
      )
      if (allCovered) {
        questionsRemoved.push(q.id)
      }
    }
  }

  // Check if we need to generate new questions
  let newQuestions: any[] = []
  if (remainingMissing.length > 0 && remainingMissing.length <= 5) {
    // Only generate new questions if there are a small number of
    // remaining gaps — otherwise the existing board is sufficient
    try {
      const gapResult = await generateGapQuestions(
        fillResult.state,
        session.incidentId
        // ... adapt to actual signature
      )
      // Filter out questions that duplicate existing ones
      const existingTexts = new Set(
        session.tier2Questions.map(q => q.text.toLowerCase().slice(0, 50))
      )
      newQuestions = (gapResult.questions || [])
        .filter((q: any) => {
          const text = (q.text || q.question || "").toLowerCase().slice(0, 50)
          return !existingTexts.has(text)
        })
        .map((q: any, i: number) => ({
          id: `t2-q${session.tier2Questions.length + i + 1}`,
          text: q.text || q.question || q,
          label: "Tier 2",
          areaHint: q.category || "Follow-up",
          tier: "tier2",
          allowDefer: true,
          required: false,
          targetFields: q.targetFields || [],
        }))
    } catch (err) {
      console.warn("[report/answer] Failed to generate new questions:", err)
    }
  }

  // Update session
  const finalSession = await updateReportSession(session.sessionId, (s) => {
    s.tier2Answers[questionId] = transcript.trim()
    s.fullNarrative = updatedNarrative
    s.agentState = fillResult.state
    s.completenessScore = newCompleteness
    s.activeDataCollectionMs += activeMs
    s.dataPointsPerQuestion.push(dpEntry)

    // Remove implicitly answered questions
    s.tier2Questions = s.tier2Questions.filter(
      q => !questionsRemoved.includes(q.id)
    )
    // Add new questions
    if (newQuestions.length > 0) {
      s.tier2Questions.push(...newQuestions)
    }

    return s
  })

  // Check if threshold reached
  // Load facility threshold from settings, default 75
  const facilityThreshold = 75  // TODO: load from FacilityModel settings
  const thresholdReached = newCompleteness >= facilityThreshold

  if (thresholdReached) {
    // Transition to closing
    await updateReportSession(session.sessionId, (s) => {
      s.reportPhase = "closing"
      return s
    })

    return Response.json({
      status: "closing_ready",
      closingQuestions: CLOSING_QUESTIONS.map(q => ({
        id: q.id,
        text: q.text,
        label: q.label,
        areaHint: q.areaHint,
        tier: q.tier,
        allowDefer: q.allowDefer,
        required: q.required,
      })),
      completenessScore: newCompleteness,
    })
  }

  // Build remaining questions list
  const remainingQuestions = finalSession.tier2Questions
    .filter(q => !finalSession.tier2Answers[q.id])
    .map(q => ({
      id: q.id,
      text: q.text,
      label: q.label,
      areaHint: q.areaHint,
      tier: q.tier,
      allowDefer: q.allowDefer,
      required: q.required,
    }))

  return Response.json({
    status: "tier2_updated",
    questionId,
    updatedFields,
    questionsRemoved,
    newQuestions: newQuestions.map(q => ({
      id: q.id, text: q.text, label: q.label, areaHint: q.areaHint,
      tier: q.tier, allowDefer: q.allowDefer, required: q.required,
    })),
    remainingQuestions,
    completenessScore: newCompleteness,
    thresholdReached: false,
    dataPointsCovered: updatedFields.length,
  })
}

// Helper: compute completeness from AgentState if not directly available
function computeCompletenessFromState(state: any): number {
  if (!state || !state.global_standards) return 0
  const fields = Object.entries(state.global_standards)
  const filled = fields.filter(([_, v]) => v !== null && v !== undefined && v !== "").length
  return Math.round((filled / fields.length) * 100)
}

CRITICAL NOTES:

1. READ fill_gaps.ts BEFORE implementing. The function signature
   may differ from what is shown above. The key integration point
   is passing the current AgentState and receiving the updated state
   with updatedFields and remainingMissing.

2. The "implicit question removal" logic depends on tier2Questions
   having a targetFields array. If generateGapQuestions does not
   return targetFields per question, you will need to either:
   a. Modify generateGapQuestions to return them (preferred)
   b. Use a heuristic (check if ANY remaining missing field matches
      the question's areaHint category)

3. The completeness score should come from the AgentState analysis,
   not from a simple "percentage of questions answered" calculation.
   The Gold Standards have 22+ fields for falls — completeness is
   about how many of those fields have values, not how many questions
   were asked.

4. Performance: fillGapsWithAnswer makes an LLM call (temperature 0,
   tool calls). Each answer round-trip takes 2-5 seconds. The
   maxDuration is already set to 60.

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Document the exact fillGapsWithAnswer signature used
- Document how targetFields are determined for implicit removal
- Create `plan/pilot_1/phase_IR1/task-IR-1c-DONE.md`
