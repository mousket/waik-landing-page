# Task IR-1d — POST /api/report/answer — Closing + Deferral Logic
## Phase: IR-1 — Incident Reporting Frontend + Backend Wiring
## Estimated Time: 2 hours
## Depends On: IR-1c complete (Tier 2 answer logic)

---

## Why This Task Exists

Two remaining branches in the answer route: closing question answers
and the "Answer Later" deferral flow. Closing questions are the three
fixed questions that appear after the completion threshold is reached.
Deferral allows the nurse to save all remaining Tier 2 questions and
return to them later from her dashboard.

---

## What This Task Modifies

1. `app/api/report/answer/route.ts` — add closing and deferral branches

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] POST with tier: "closing" stores answer in closingAnswers
- [ ] When all 3 closing questions answered, returns allClosingComplete: true
- [ ] POST with questionId: "__DEFER_ALL__" marks remaining questions as deferred
- [ ] Deferral writes current state to MongoDB incident (partial save)
- [ ] Deferral response includes deferredQuestionIds and completenessScore
- [ ] After deferral, session stays alive in Redis (2hr TTL reset)
- [ ] Nurse can return after deferral and continue answering Tier 2 questions
- [ ] MongoDB incident.questionsDeferred count updated on deferral

---

## Test Cases

```
TEST 1 — Answer closing question
  Action: POST with tier: "closing", questionId: "c-q1"
  Expected: {
    status: "closing_updated",
    answered: ["c-q1"],
    remaining: ["c-q2", "c-q3"],
    allClosingComplete: false
  }
  Pass/Fail: ___

TEST 2 — Answer all closing questions
  Action: POST answers for c-q1, c-q2, c-q3
  Expected: Final response has allClosingComplete: true
  Verify: Redis session.reportPhase = "signoff"
  Pass/Fail: ___

TEST 3 — Defer all remaining questions
  Action: POST with questionId: "__DEFER_ALL__" and tier: "tier2"
  Expected: {
    status: "deferred",
    deferredQuestionIds: ["t2-q3", "t2-q5", ...],
    completenessScore: <current>,
    message: "Your progress has been saved..."
  }
  Verify: Redis session.tier2DeferredIds populated
  Verify: MongoDB incident.questionsDeferred = count
  Verify: MongoDB incident.completenessScore = current score
  Pass/Fail: ___

TEST 4 — Return after deferral to answer remaining questions
  Action: After TEST 3, POST with tier: "tier2", questionId: "t2-q3"
  Expected: Normal tier2_updated response
  Verify: Redis session still valid (TTL was reset)
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am adding closing question and deferral logic to the
/api/report/answer route for WAiK.

MODIFY app/api/report/answer/route.ts

═══════════════════════════════════════════════════════════
ADD to the tier routing in POST function:
═══════════════════════════════════════════════════════════

if (tier === "closing") {
  return handleClosingAnswer(session, questionId, transcript || "", activeMs || 0)
}

// Handle deferral — check BEFORE the tier routing
if (questionId === "__DEFER_ALL__") {
  return handleDeferAll(session)
}

═══════════════════════════════════════════════════════════
IMPLEMENT handleClosingAnswer:
═══════════════════════════════════════════════════════════

async function handleClosingAnswer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number
): Promise<Response> {

  // Validate questionId exists in closingQuestions
  const exists = session.closingQuestions.some(q => q.id === questionId)
  if (!exists) {
    return Response.json({ error: `Invalid closing questionId: ${questionId}` }, { status: 400 })
  }

  // Update session
  const updated = await updateReportSession(session.sessionId, (s) => {
    s.closingAnswers[questionId] = transcript.trim()
    s.fullNarrative = s.fullNarrative + "\n\n" + transcript.trim()
    s.activeDataCollectionMs += activeMs
    return s
  })

  // Check if all closing questions are answered
  const answeredIds = Object.keys(updated.closingAnswers)
    .filter(id => updated.closingAnswers[id].trim().length > 0)
  const allIds = updated.closingQuestions.map(q => q.id)
  const remaining = allIds.filter(id => !answeredIds.includes(id))
  const allComplete = remaining.length === 0

  if (allComplete) {
    // Transition to signoff
    await updateReportSession(session.sessionId, (s) => {
      s.reportPhase = "signoff"
      return s
    })
  }

  return Response.json({
    status: "closing_updated",
    answered: answeredIds,
    remaining,
    allClosingComplete: allComplete,
  })
}

═══════════════════════════════════════════════════════════
IMPLEMENT handleDeferAll:
═══════════════════════════════════════════════════════════

async function handleDeferAll(session: ReportSession): Promise<Response> {
  // Find all unanswered Tier 2 question IDs
  const unansweredIds = session.tier2Questions
    .map(q => q.id)
    .filter(id => !session.tier2Answers[id])

  // Update Redis session
  const updated = await updateReportSession(session.sessionId, (s) => {
    s.tier2DeferredIds = [...new Set([...s.tier2DeferredIds, ...unansweredIds])]
    return s
  })

  // Write partial state to MongoDB (background, don't block response)
  try {
    await connectToDatabase()
    const { IncidentModel } = await import("@/backend/src/models/incident.model")
    await IncidentModel.updateOne(
      { id: session.incidentId, facilityId: session.facilityId },
      {
        $set: {
          completenessScore: updated.completenessScore,
          questionsDeferred: updated.tier2DeferredIds.length,
          questionsAnswered: Object.keys(updated.tier2Answers).length,
          updatedAt: new Date(),
        }
      }
    )
  } catch (err) {
    console.error("[report/answer] Failed to save deferred state to Mongo:", err)
    // Non-blocking — Redis is the source of truth during the session
  }

  return Response.json({
    status: "deferred",
    deferredQuestionIds: unansweredIds,
    completenessScore: updated.completenessScore,
    message: "Your progress has been saved. We will remind you in 2 hours.",
  })
}

IMPORTANT: Make sure the __DEFER_ALL__ check happens BEFORE the tier
routing, since it uses a special questionId rather than a tier value.

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_IR1/task-IR-1d-DONE.md`
