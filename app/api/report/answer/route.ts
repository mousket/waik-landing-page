/**
 * POST /api/report/answer — incident reporting answer router.
 *
 * Dispatches by `tier`:
 *  - **tier1** (IR-1b): persist transcript, grow `fullNarrative`, and on
 *    the final Tier 1 answer trigger gap analysis to produce the Tier 2
 *    board.
 *  - **tier2** (IR-1c): re-analyze the growing narrative with
 *    `fillGapsWithAnswer`, remove implicitly answered questions,
 *    optionally generate new gap questions, update completeness, and
 *    transition to closing once the facility threshold is reached.
 *  - **closing** (IR-1d): persist closing answers, transition to `signoff`
 *    when all three are collected.
 *  - **defer** (IR-1d): sentinel `questionId === "__DEFER_ALL__"` saves
 *    remaining Tier 2 questions for later and writes a partial state
 *    snapshot to MongoDB.
 *
 * See documentation/pilot_1_plan/incident_report/WAiK_Incident_Reporting_Blueprint.md §2 + §3.
 */

import { NextResponse } from "next/server"

import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"

import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import {
  analyzeNarrativeAndScore,
  computeCompleteness,
} from "@/lib/agents/expert_investigator/analyze"
import { fillGapsWithAnswer } from "@/lib/agents/expert_investigator/fill_gaps"
import {
  generateGapQuestions,
  type MissingFieldDescriptor,
} from "@/lib/agents/expert_investigator/gap_questions"
import { CLOSING_QUESTIONS } from "@/lib/config/tier1-questions"
import {
  getReportSession,
  updateReportSession,
  type DataPointCoverageEntry,
  type ReportBoardQuestion,
  type ReportSession,
} from "@/lib/config/report-session"

/** Default facility-wide completeness threshold for closing transition (%). */
const DEFAULT_CLOSING_THRESHOLD = 75

/** Cap on auto-generated tier-2 follow-up questions per round. */
const MAX_NEW_QUESTIONS_PER_ROUND = 3

/** Sentinel questionId for the "Answer Later" deferral flow. */
const DEFER_ALL_SENTINEL = "__DEFER_ALL__"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface AnswerRequestBody {
  sessionId?: string
  questionId?: string
  transcript?: string
  tier?: "tier1" | "tier2" | "closing"
  activeMs?: number
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  let body: AnswerRequestBody
  try {
    body = (await request.json()) as AnswerRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { sessionId, questionId, transcript, tier, activeMs } = body

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  }
  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 })
  }
  if (!tier) {
    return NextResponse.json({ error: "tier required" }, { status: 400 })
  }

  const session = await getReportSession(sessionId)
  if (!session) {
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 },
    )
  }
  if (session.userId !== user.userId) {
    return NextResponse.json(
      { error: "Session does not belong to this user" },
      { status: 403 },
    )
  }

  // Deferral sentinel — bypass tier dispatch and questionId validation.
  if (questionId === DEFER_ALL_SENTINEL) {
    return handleDeferAll(session)
  }

  if (tier === "tier1") {
    return handleTier1Answer(
      session,
      questionId,
      typeof transcript === "string" ? transcript : "",
      Number.isFinite(activeMs) ? Number(activeMs) : 0,
      session.userName ?? "",
    )
  }

  if (tier === "tier2") {
    return handleTier2Answer(
      session,
      questionId,
      typeof transcript === "string" ? transcript : "",
      Number.isFinite(activeMs) ? Number(activeMs) : 0,
    )
  }

  if (tier === "closing") {
    return handleClosingAnswer(
      session,
      questionId,
      typeof transcript === "string" ? transcript : "",
      Number.isFinite(activeMs) ? Number(activeMs) : 0,
    )
  }

  return NextResponse.json(
    { error: `Tier "${tier}" not yet implemented` },
    { status: 400 },
  )
}

async function handleTier1Answer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number,
  responderName: string,
): Promise<Response> {
  const isValidTier1 = session.tier1Questions.some((q) => q.id === questionId)
  if (!isValidTier1) {
    return NextResponse.json(
      { error: `Invalid Tier 1 questionId: ${questionId}` },
      { status: 400 },
    )
  }

  const trimmed = transcript.trim()

  let updated = await updateReportSession(session.sessionId, (s) => {
    s.tier1Answers[questionId] = trimmed
    if (trimmed.length > 0) {
      s.fullNarrative = s.fullNarrative
        ? `${s.fullNarrative}\n\n${trimmed}`
        : trimmed
    }
    s.activeDataCollectionMs += Math.max(0, activeMs)
    return s
  })

  const allTier1Ids = updated.tier1Questions.map((q) => q.id)
  const answeredIds = allTier1Ids.filter(
    (id) => (updated.tier1Answers[id] ?? "").trim().length > 0,
  )
  const remainingIds = allTier1Ids.filter((id) => !answeredIds.includes(id))
  const allTier1Complete = remainingIds.length === 0

  if (!allTier1Complete) {
    return NextResponse.json({
      status: "tier1_updated",
      questionId,
      answered: answeredIds,
      remaining: remainingIds,
      completenessScore: updated.completenessScore,
      allTier1Complete: false,
    })
  }

  // ─── All Tier 1 answered → gap analysis ──────────────────────────────────
  try {
    const analysis = await analyzeNarrativeAndScore(updated.fullNarrative)
    const gap = await generateGapQuestions(analysis.state, {
      responderName: responderName || undefined,
    })

    const tier2Questions: ReportBoardQuestion[] = gap.questions.map(
      (text, i) => buildTier2Question(text, i, gap.missingFields[i]),
    )

    updated = await updateReportSession(updated.sessionId, (s) => {
      s.reportPhase = "tier2"
      s.tier1CompletedAt = new Date().toISOString()
      s.agentState = analysis.state
      s.tier2Questions = tier2Questions
      s.completenessScore = analysis.completenessScore
      s.completenessAtTier1 = analysis.completenessScore
      return s
    })

    return NextResponse.json({
      status: "gap_analysis_complete",
      tier2Questions: tier2Questions.map(stripInternal),
      completenessScore: analysis.completenessScore,
      completenessAtTier1: analysis.completenessScore,
      totalGapsIdentified: gap.missingFields.length,
      questionsGenerated: tier2Questions.length,
    })
  } catch (error) {
    console.error("[report/answer] Gap analysis error:", error)

    await updateReportSession(updated.sessionId, (s) => {
      s.tier1CompletedAt = new Date().toISOString()
      return s
    })

    return NextResponse.json({
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

function buildTier2Question(
  text: string,
  index: number,
  missing: MissingFieldDescriptor | undefined,
): ReportBoardQuestion {
  return {
    id: `t2-q${index + 1}`,
    text,
    label: "Tier 2",
    areaHint: missing?.label ?? "Follow-up",
    tier: "tier2",
    allowDefer: true,
    required: false,
    targetFields: missing ? [missing.key] : [],
  }
}

function stripInternal(q: ReportBoardQuestion) {
  return {
    id: q.id,
    text: q.text,
    label: q.label,
    areaHint: q.areaHint,
    tier: q.tier,
    allowDefer: q.allowDefer,
    required: q.required,
  }
}

// ─── Tier 2 handler (IR-1c) ──────────────────────────────────────────────

async function handleTier2Answer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number,
): Promise<Response> {
  const question = session.tier2Questions.find((q) => q.id === questionId)
  if (!question) {
    return NextResponse.json(
      { error: `Invalid Tier 2 questionId: ${questionId}` },
      { status: 400 },
    )
  }

  if (!session.agentState) {
    return NextResponse.json(
      { error: "Session is not ready for Tier 2 answers (missing agentState)" },
      { status: 409 },
    )
  }

  const trimmed = transcript.trim()
  const grownNarrative = trimmed.length > 0
    ? (session.fullNarrative ? `${session.fullNarrative}\n\n${trimmed}` : trimmed)
    : session.fullNarrative

  // ─── Core intelligence: re-analyze narrative against Gold Standards ────
  let fillResult
  try {
    fillResult = await fillGapsWithAnswer({
      state: session.agentState,
      answerText: trimmed,
      questionText: question.text,
    })
  } catch (error) {
    console.error("[report/answer] fillGapsWithAnswer error:", error)
    return NextResponse.json(
      { error: "Gap fill failed; please retry" },
      { status: 502 },
    )
  }

  // Recompute completeness from the freshly merged state for an authoritative
  // score (the LLM tool path doesn't always update state.completenessScore).
  const { completenessScore: newCompleteness } = computeCompleteness(
    fillResult.state,
  )

  const updatedFields = fillResult.updatedFields
  const remainingMissingKeys = new Set(
    fillResult.remainingMissing.map((m) => m.key),
  )

  // Implicit removal: any unanswered Tier 2 question whose targetFields are
  // all now filled (i.e., none remain in remainingMissingKeys) is dropped.
  const questionsRemoved: string[] = []
  for (const q of session.tier2Questions) {
    if (q.id === questionId) continue
    if (session.tier2Answers[q.id]) continue
    if (!q.targetFields || q.targetFields.length === 0) continue
    const allCovered = q.targetFields.every((f) => !remainingMissingKeys.has(f))
    if (allCovered) questionsRemoved.push(q.id)
  }

  // Optionally generate fresh gap questions when only a few fields remain.
  // Skip generation when the board already has plenty of unanswered items —
  // we don't want to bloat the UI.
  let newQuestions: ReportBoardQuestion[] = []
  const unansweredCount = session.tier2Questions.filter(
    (q) => !session.tier2Answers[q.id] && !questionsRemoved.includes(q.id),
  ).length

  if (
    fillResult.remainingMissing.length > 0 &&
    unansweredCount <= 2 &&
    newCompleteness < DEFAULT_CLOSING_THRESHOLD
  ) {
    try {
      const gap = await generateGapQuestions(fillResult.state, {
        responderName: session.userName || undefined,
        previousQuestions: session.tier2Questions.map((q) => q.text),
        lastAnswer: trimmed || undefined,
        maxQuestions: MAX_NEW_QUESTIONS_PER_ROUND,
      })

      const existingTexts = new Set(
        session.tier2Questions.map((q) => q.text.toLowerCase().slice(0, 60)),
      )
      const baseIndex = session.tier2Questions.length
      newQuestions = gap.questions
        .filter(
          (text) => !existingTexts.has(text.toLowerCase().slice(0, 60)),
        )
        .slice(0, MAX_NEW_QUESTIONS_PER_ROUND)
        .map((text, i) =>
          buildTier2Question(text, baseIndex + i, gap.missingFields[i]),
        )
    } catch (err) {
      console.warn("[report/answer] Failed to generate new tier2 questions:", err)
    }
  }

  const dpEntry: DataPointCoverageEntry = {
    questionId,
    questionText: question.text,
    dataPointsCovered: updatedFields.length,
    fieldsCovered: updatedFields,
  }

  const updated = await updateReportSession(session.sessionId, (s) => {
    s.tier2Answers[questionId] = trimmed
    s.fullNarrative = grownNarrative
    s.agentState = fillResult.state
    s.completenessScore = newCompleteness
    s.activeDataCollectionMs += Math.max(0, activeMs)
    s.dataPointsPerQuestion.push(dpEntry)
    s.tier2Questions = s.tier2Questions.filter(
      (q) => !questionsRemoved.includes(q.id),
    )
    if (newQuestions.length > 0) {
      s.tier2Questions.push(...newQuestions)
    }
    return s
  })

  // Threshold check → transition to closing
  if (newCompleteness >= DEFAULT_CLOSING_THRESHOLD) {
    await updateReportSession(updated.sessionId, (s) => {
      s.reportPhase = "closing"
      return s
    })

    return NextResponse.json({
      status: "closing_ready",
      questionId,
      updatedFields,
      questionsRemoved,
      closingQuestions: CLOSING_QUESTIONS.map((q) => ({
        id: q.id,
        text: q.text,
        label: q.label,
        areaHint: q.areaHint,
        tier: q.tier,
        allowDefer: q.allowDefer,
        required: q.required,
      })),
      completenessScore: newCompleteness,
      thresholdReached: true,
      dataPointsCovered: updatedFields.length,
    })
  }

  const remainingQuestions = updated.tier2Questions
    .filter((q) => !updated.tier2Answers[q.id])
    .map(stripInternal)

  return NextResponse.json({
    status: "tier2_updated",
    questionId,
    updatedFields,
    questionsRemoved,
    newQuestions: newQuestions.map(stripInternal),
    remainingQuestions,
    completenessScore: newCompleteness,
    thresholdReached: false,
    dataPointsCovered: updatedFields.length,
  })
}

// ─── Closing handler (IR-1d) ─────────────────────────────────────────────

async function handleClosingAnswer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number,
): Promise<Response> {
  const exists = session.closingQuestions.some((q) => q.id === questionId)
  if (!exists) {
    return NextResponse.json(
      { error: `Invalid closing questionId: ${questionId}` },
      { status: 400 },
    )
  }

  const trimmed = transcript.trim()

  let updated = await updateReportSession(session.sessionId, (s) => {
    s.closingAnswers[questionId] = trimmed
    if (trimmed.length > 0) {
      s.fullNarrative = s.fullNarrative
        ? `${s.fullNarrative}\n\n${trimmed}`
        : trimmed
    }
    s.activeDataCollectionMs += Math.max(0, activeMs)
    return s
  })

  const allIds = updated.closingQuestions.map((q) => q.id)
  const answeredIds = allIds.filter(
    (id) => (updated.closingAnswers[id] ?? "").trim().length > 0,
  )
  const remaining = allIds.filter((id) => !answeredIds.includes(id))
  const allClosingComplete = remaining.length === 0

  if (allClosingComplete) {
    updated = await updateReportSession(updated.sessionId, (s) => {
      s.reportPhase = "signoff"
      return s
    })
  }

  return NextResponse.json({
    status: "closing_updated",
    questionId,
    answered: answeredIds,
    remaining,
    allClosingComplete,
  })
}

// ─── Deferral handler (IR-1d) ────────────────────────────────────────────

async function handleDeferAll(session: ReportSession): Promise<Response> {
  const unansweredIds = session.tier2Questions
    .map((q) => q.id)
    .filter((id) => !(session.tier2Answers[id]?.trim().length))

  const updated = await updateReportSession(session.sessionId, (s) => {
    const next = new Set([...s.tier2DeferredIds, ...unansweredIds])
    s.tier2DeferredIds = Array.from(next)
    return s
  })

  // Best-effort partial snapshot to MongoDB. Redis remains the source of
  // truth during the live session, so a Mongo failure is non-fatal.
  try {
    await connectMongo()
    await IncidentModel.updateOne(
      { id: session.incidentId, facilityId: session.facilityId },
      {
        $set: {
          completenessScore: updated.completenessScore,
          questionsDeferred: updated.tier2DeferredIds.length,
          questionsAnswered: Object.keys(updated.tier2Answers).filter(
            (id) => (updated.tier2Answers[id] ?? "").trim().length > 0,
          ).length,
          updatedAt: new Date(),
        },
      },
    )
  } catch (err) {
    console.error("[report/answer] Failed to save deferred state to Mongo:", err)
  }

  return NextResponse.json({
    status: "deferred",
    deferredQuestionIds: updated.tier2DeferredIds,
    completenessScore: updated.completenessScore,
    message: "Your progress has been saved. We will remind you in 2 hours.",
  })
}
