# Task IR-1b — POST /api/report/answer — Tier 1 Logic
## Phase: IR-1 — Incident Reporting Frontend + Backend Wiring
## Estimated Time: 2–3 hours
## Depends On: IR-1a complete (start route, ReportSession, Tier 1 config)

---

## Why This Task Exists

This task creates the answer route and wires the Tier 1 answer flow.
When the nurse answers a Tier 1 question, the transcript is persisted
to the Redis session, the fullNarrative grows, and the question board
state updates. When all five Tier 1 questions are answered, the route
triggers gap analysis via the expert investigator pipeline and returns
the Tier 2 question board.

This is the most important backend integration moment in the rebuild:
the bridge between the nurse's voice and the AI's intelligence.

---

## What This Task Creates

1. `app/api/report/answer/route.ts` — POST route (Tier 1 branch only in this task; Tier 2 and closing added in IR-1c and IR-1d)

---

## Context Files

- `lib/config/report-session.ts` — getReportSession, updateReportSession
- `lib/config/tier1-questions.ts` — FALL_TIER1_QUESTIONS
- `lib/agents/expert_investigator/analyze.ts` — analyzeNarrativeAndScore
- `lib/agents/expert_investigator/gap_questions.ts` — generateGapQuestions
- `lib/agents/expert_investigator/graph.ts` — startInvestigatorConversation (reference)
- `lib/auth.ts` — getCurrentUser
- `blueprint/WAiK_Incident_Reporting_Blueprint.md` — Section 2 API contract

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] POST /api/report/answer with tier: "tier1" stores answer in Redis session
- [ ] fullNarrative in Redis session grows with each answer
- [ ] activeDataCollectionMs accumulates from each answer's activeMs
- [ ] Response includes answered[], remaining[], completenessScore, allTier1Complete
- [ ] When all 5 Tier 1 answers are submitted, gap analysis triggers
- [ ] Gap analysis calls analyzeNarrativeAndScore with the full concatenated narrative
- [ ] Gap analysis calls generateGapQuestions with the resulting AgentState
- [ ] Response includes tier2Questions array after gap analysis completes
- [ ] completenessAtTier1 is recorded in session after gap analysis
- [ ] tier2QuestionsGenerated count is stored in session
- [ ] Session missing → 404 response
- [ ] Session belongs to different user → 403 response
- [ ] Invalid questionId → 400 response

---

## Test Cases

```
TEST 1 — Answer first Tier 1 question
  Action: POST /api/report/answer
  Body: {
    sessionId: "<from start>",
    questionId: "t1-q1",
    transcript: "I found Margaret on the floor next to her bed. She was lying on her left side. The bed rail was down.",
    tier: "tier1",
    activeMs: 45000
  }
  Expected: 200 with {
    status: "tier1_updated",
    questionId: "t1-q1",
    answered: ["t1-q1"],
    remaining: ["t1-q2", "t1-q3", "t1-q4", "t1-q5"],
    completenessScore: <number>,
    allTier1Complete: false
  }
  Verify: Redis session has tier1Answers["t1-q1"] = transcript
  Verify: Redis session has fullNarrative containing the transcript
  Verify: Redis session has activeDataCollectionMs = 45000
  Pass/Fail: ___

TEST 2 — Answer remaining Tier 1 questions
  Action: POST answers for t1-q2 through t1-q4
  Expected: Each returns tier1_updated with growing answered[] array
  Pass/Fail: ___

TEST 3 — Answer final Tier 1 question triggers gap analysis
  Action: POST answer for t1-q5 (the last unanswered Tier 1 question)
  Expected: 200 with {
    status: "gap_analysis_complete",
    tier2Questions: array of 5-15 questions,
    completenessScore: <number from Gold Standard analysis>,
    completenessAtTier1: <same number, locked>,
    totalGapsIdentified: <number>,
    questionsGenerated: <number matching tier2Questions.length>
  }
  Verify: Redis session.reportPhase = "tier2"
  Verify: Redis session.agentState is populated (not null)
  Verify: Redis session.tier2Questions has the generated questions
  Verify: Redis session.completenessAtTier1 is set
  Pass/Fail: ___

TEST 4 — Session not found
  Action: POST with sessionId: "nonexistent-id"
  Expected: 404 { error: "Session not found or expired" }
  Pass/Fail: ___

TEST 5 — Session belongs to different user
  Action: POST with valid sessionId but auth token for a different user
  Expected: 403 { error: "Session does not belong to this user" }
  Pass/Fail: ___

TEST 6 — Duplicate answer for already-answered question
  Action: POST answer for t1-q1 when t1-q1 is already answered
  Expected: 200 — overwrites the previous answer (allow re-recording)
  Verify: Redis session tier1Answers["t1-q1"] has the new transcript
  Pass/Fail: ___

TEST 7 — 45-second timeout on gap analysis
  Action: If gap analysis takes > 45 seconds
  Expected: 200 with {
    status: "gap_analysis_complete" (still returns even if slow)
  }
  OR if timeout hit: {
    status: "tier1_updated" with a flag indicating analysis is in progress
  }
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am building the /api/report/answer route for WAiK.
This task handles TIER 1 ANSWERS ONLY. Tier 2 and closing will be
added in subsequent tasks (IR-1c and IR-1d).

REFERENCE: Read the architectural blueprint at
plan/pilot_1/blueprint/WAiK_Incident_Reporting_Blueprint.md
Section 2 (POST /api/report/answer) and Section 3 (Expert Investigator Integration).

═══════════════════════════════════════════════════════════
CREATE app/api/report/answer/route.ts
═══════════════════════════════════════════════════════════

import { getCurrentUser } from "@/lib/auth"
import { getReportSession, updateReportSession } from "@/lib/config/report-session"
// Expert investigator imports — use the EXISTING functions:
import { analyzeNarrativeAndScore } from "@/lib/agents/expert_investigator/analyze"
import { generateGapQuestions } from "@/lib/agents/expert_investigator/gap_questions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: Request) {
  // 1. Auth
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  // 2. Parse body
  const body = await request.json()
  const { sessionId, questionId, transcript, tier, activeMs } = body

  if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 })
  if (!questionId) return Response.json({ error: "questionId required" }, { status: 400 })

  // 3. Load session
  const session = await getReportSession(sessionId)
  if (!session) {
    return Response.json({ error: "Session not found or expired" }, { status: 404 })
  }
  if (session.userId !== user.userId) {
    return Response.json({ error: "Session does not belong to this user" }, { status: 403 })
  }

  // 4. Route by tier
  if (tier === "tier1") {
    return handleTier1Answer(session, questionId, transcript || "", activeMs || 0)
  }

  // Tier 2 and closing will be added in IR-1c and IR-1d
  // For now, return 400 for unsupported tiers
  return Response.json({ error: `Tier "${tier}" not yet implemented` }, { status: 400 })
}

async function handleTier1Answer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number
): Promise<Response> {
  // Validate questionId exists in tier1Questions
  const questionExists = session.tier1Questions.some(q => q.id === questionId)
  if (!questionExists) {
    return Response.json({ error: `Invalid Tier 1 questionId: ${questionId}` }, { status: 400 })
  }

  // Update session with answer
  let updatedSession = await updateReportSession(session.sessionId, (s) => {
    s.tier1Answers[questionId] = transcript.trim()
    s.fullNarrative = s.fullNarrative
      ? s.fullNarrative + "\n\n" + transcript.trim()
      : transcript.trim()
    s.activeDataCollectionMs += activeMs
    return s
  })

  // Check if all Tier 1 questions are answered
  const answeredIds = Object.keys(updatedSession.tier1Answers)
    .filter(id => updatedSession.tier1Answers[id].trim().length > 0)
  const allTier1Ids = updatedSession.tier1Questions.map(q => q.id)
  const remainingIds = allTier1Ids.filter(id => !answeredIds.includes(id))
  const allTier1Complete = remainingIds.length === 0

  if (!allTier1Complete) {
    // Return simple update — no gap analysis yet
    return Response.json({
      status: "tier1_updated",
      questionId,
      answered: answeredIds,
      remaining: remainingIds,
      completenessScore: updatedSession.completenessScore,
      allTier1Complete: false,
    })
  }

  // ═══════════════════════════════════════════════════════
  // ALL TIER 1 COMPLETE — TRIGGER GAP ANALYSIS
  // ═══════════════════════════════════════════════════════

  try {
    // Step 1: Analyze narrative against Gold Standards
    // This calls the EXISTING analyzeNarrativeAndScore function
    // from lib/agents/expert_investigator/analyze.ts
    //
    // IMPORTANT: Check the actual function signature in analyze.ts.
    // It may take the narrative as a string and return an object with:
    //   { state: AgentState, score: number, feedback: string }
    // Adapt the call to match the actual signature.

    const analysisResult = await analyzeNarrativeAndScore(
      updatedSession.fullNarrative
    )

    // Step 2: Generate compressed gap-fill questions
    // This calls the EXISTING generateGapQuestions function
    // from lib/agents/expert_investigator/gap_questions.ts
    //
    // IMPORTANT: Check the actual function signature in gap_questions.ts.
    // It may take the AgentState and other params.
    // Adapt the call to match the actual signature.

    const gapResult = await generateGapQuestions(
      analysisResult.state,
      updatedSession.incidentId
      // ... add any other required params based on actual signature
    )

    // Step 3: Build Tier 2 question objects from gap results
    const tier2Questions = (gapResult.questions || []).map((q: any, i: number) => ({
      id: `t2-q${i + 1}`,
      text: q.text || q.question || q,
      label: `Tier 2`,
      areaHint: q.category || q.goldStandardField || "Follow-up",
      tier: "tier2" as const,
      allowDefer: true,
      required: false,
      targetFields: q.targetFields || q.goldStandardFields || [],
    }))

    // Step 4: Update session with gap analysis results
    const completenessFromAnalysis = analysisResult.score ?? 
      (analysisResult.state?.completenessScore ?? 0)

    updatedSession = await updateReportSession(updatedSession.sessionId, (s) => {
      s.reportPhase = "tier2"
      s.tier1CompletedAt = new Date().toISOString()
      s.agentState = analysisResult.state
      s.tier2Questions = tier2Questions
      s.completenessScore = completenessFromAnalysis
      s.completenessAtTier1 = completenessFromAnalysis
      return s
    })

    // Step 5: Return gap analysis result
    return Response.json({
      status: "gap_analysis_complete",
      tier2Questions: tier2Questions.map(q => ({
        id: q.id,
        text: q.text,
        label: q.label,
        areaHint: q.areaHint,
        tier: q.tier,
        allowDefer: q.allowDefer,
        required: q.required,
      })),
      completenessScore: completenessFromAnalysis,
      completenessAtTier1: completenessFromAnalysis,
      totalGapsIdentified: gapResult.missingFields?.length ?? 0,
      questionsGenerated: tier2Questions.length,
    })

  } catch (error) {
    console.error("[report/answer] Gap analysis error:", error)

    // If gap analysis fails, still save progress and return gracefully
    updatedSession = await updateReportSession(updatedSession.sessionId, (s) => {
      s.tier1CompletedAt = new Date().toISOString()
      return s
    })

    return Response.json({
      status: "gap_analysis_complete",
      tier2Questions: [],
      completenessScore: 0,
      completenessAtTier1: 0,
      totalGapsIdentified: 0,
      questionsGenerated: 0,
      warning: "Gap analysis encountered an error. You may need to restart.",
    })
  }
}

CRITICAL IMPLEMENTATION NOTES:

1. CHECK THE ACTUAL SIGNATURES of analyzeNarrativeAndScore and
   generateGapQuestions in the existing codebase. The function names
   are correct but the parameter shapes may differ from what is
   written above. Read those files first, then adapt the calls.

2. The analyzeNarrativeAndScore function uses OpenAI with temperature 0
   and tool/function calling. It may take additional parameters beyond
   just the narrative string. Check analyze.ts for the full signature.

3. The generateGapQuestions function takes AgentState and may need
   additional context. Check gap_questions.ts for the full signature.

4. The questions returned by generateGapQuestions may have a different
   shape than what I mapped above. Inspect the actual return type and
   map it to the tier2Questions format.

5. If the existing functions require an InvestigatorSession or
   sessionId from the old session_store.ts, you have two options:
   a. Create a temporary InvestigatorSession and pass it through
   b. Extract the core logic from the functions and call it directly
   Option (a) is preferred because it reuses proven code.

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_IR1/task-IR-1b-DONE.md`
- Document the exact function signatures used from analyze.ts and gap_questions.ts
