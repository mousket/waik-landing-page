import connectMongo from "@/backend/src/lib/mongodb"
import { NextResponse } from "next/server"
import {
  analyzeNarrativeAndScore,
  computeCompleteness,
  sanitizeGlobalStandards,
} from "@/lib/agents/expert_investigator/analyze"
import { fillGapsWithAnswer } from "@/lib/agents/expert_investigator/fill_gaps"
import {
  collectMissingFields,
  generateGapQuestions,
} from "@/lib/agents/expert_investigator/gap_questions"
import type { PendingQuestion } from "@/lib/agents/expert_investigator/session_store"
import { getCurrentUser } from "@/lib/auth"
import { CLOSING_QUESTIONS } from "@/lib/config/tier1-questions"
import {
  getReportSession,
  updateReportSession,
  type ReportSession,
} from "@/lib/config/report-session"
import type { AgentState } from "@/lib/gold_standards"
import {
  buildNextTier2Board,
  completenessToPercent,
  formatSubtypeLabel,
  getFacilityFallCompletenessThreshold,
  goldFieldDisplayKeys,
  supplementTier2Questions,
} from "@/lib/report/tier2-board"
import { normalizeExtractionFromNarrative } from "@/lib/agents/expert_investigator/extraction-normalizer"
import {
  buildTier1Narrative,
  tier1AnsweredIds,
  tier1ProgressScore,
} from "@/lib/report/tier1-narrative"
import { tier1PromptTextsForGapAnalysis } from "@/lib/report/tier1-gap-prompts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const GAP_ANALYSIS_TIMEOUT_MS = 45_000

function seedAgentStateFromReport(session: ReportSession): AgentState {
  return {
    global_standards: sanitizeGlobalStandards({
      resident_name: session.residentName,
      room_number: session.residentRoom,
      location_of_fall: session.location,
    }),
    sub_type: null,
    sub_type_data: null,
  }
}

function mapGapStringsToTier2Pending(questions: string[]): PendingQuestion[] {
  const askedAt = new Date().toISOString()
  return questions.map((text, i) => ({
    id: `t2-q${i + 1}`,
    text,
    askedAt,
  }))
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
  const questionId = typeof body.questionId === "string" ? body.questionId.trim() : ""
  const transcript = typeof body.transcript === "string" ? body.transcript : ""
  const tier = body.tier
  const activeMsRaw = body.activeMs
  const activeMs =
    typeof activeMsRaw === "number" && Number.isFinite(activeMsRaw) && activeMsRaw >= 0
      ? Math.round(activeMsRaw)
      : 0

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  }
  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 })
  }

  const session = await getReportSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 404 })
  }
  if (session.tier2QuestionsGenerated == null) {
    session.tier2QuestionsGenerated = 0
  }
  if (session.userId !== user.userId) {
    return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 })
  }

  if (questionId === "__DEFER_ALL__") {
    if (tier !== "tier2") {
      return NextResponse.json(
        { error: 'Deferral requires tier: "tier2"' },
        { status: 400 },
      )
    }
    return handleDeferAll(session)
  }

  if (tier == null || tier === "") {
    return NextResponse.json({ error: "tier required" }, { status: 400 })
  }
  if (tier === "tier1") {
    return handleTier1Answer(session, questionId, transcript, activeMs)
  }
  if (tier === "tier2") {
    return handleTier2Answer(session, questionId, transcript, activeMs)
  }
  if (tier === "closing") {
    return handleClosingAnswer(session, questionId, transcript, activeMs)
  }

  return NextResponse.json({ error: `Tier "${String(tier)}" not supported` }, { status: 400 })
}

async function handleTier1Answer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number,
): Promise<Response> {
  if (session.reportPhase !== "tier1") {
    return NextResponse.json(
      { error: "Tier 1 is complete for this session; use Tier 2 or closing flows." },
      { status: 400 },
    )
  }

  const questionExists = session.tier1Questions.some((q) => q.id === questionId)
  if (!questionExists) {
    return NextResponse.json({ error: `Invalid Tier 1 questionId: ${questionId}` }, { status: 400 })
  }

  let updatedSession = await updateReportSession(session.sessionId, (s) => {
    s.tier1Answers[questionId] = transcript.trim()
    s.fullNarrative = buildTier1Narrative(s)
    s.activeDataCollectionMs += activeMs
    s.completenessScore = tier1ProgressScore(s)
    return s
  })

  const answeredIds = tier1AnsweredIds(updatedSession)
  const allTier1Ids = updatedSession.tier1Questions.map((q) => q.id)
  const remainingIds = allTier1Ids.filter((id) => !answeredIds.includes(id))
  const allTier1Complete = remainingIds.length === 0

  if (!allTier1Complete) {
    return NextResponse.json({
      status: "tier1_updated",
      questionId,
      answered: answeredIds,
      remaining: remainingIds,
      completenessScore: updatedSession.completenessScore,
      allTier1Complete: false,
    })
  }

  try {
    const { analysisResult, gapResult } = await runWithTimeout(
      (async () => {
        const analysisResult = await analyzeNarrativeAndScore(
          updatedSession.fullNarrative,
          seedAgentStateFromReport(updatedSession),
        )
        const gapResult = await generateGapQuestions(analysisResult.state, {
          maxQuestions: 15,
          responderName: updatedSession.userName || undefined,
          previousQuestions: tier1PromptTextsForGapAnalysis(updatedSession),
          subtypeLabel: formatSubtypeLabel(analysisResult.state.sub_type),
        })
        return { analysisResult, gapResult }
      })(),
      GAP_ANALYSIS_TIMEOUT_MS,
      "gap_analysis",
    )

    const tier2Questions = mapGapStringsToTier2Pending(gapResult.questions)
    const completenessFromAnalysis = completenessToPercent(analysisResult.completenessScore)

    updatedSession = await updateReportSession(updatedSession.sessionId, (s) => {
      s.reportPhase = "tier2"
      s.tier1CompletedAt = new Date().toISOString()
      s.agentState = analysisResult.state
      s.tier2Questions = tier2Questions
      s.completenessScore = completenessFromAnalysis
      s.completenessAtTier1 = completenessFromAnalysis
      s.tier2QuestionsGenerated = tier2Questions.length
      return s
    })

    return NextResponse.json({
      status: "gap_analysis_complete",
      tier2Questions: tier2Questions.map((q) => ({
        id: q.id,
        text: q.text,
        label: "Tier 2",
        areaHint: "Follow-up",
        tier: "tier2" as const,
        allowDefer: true,
        required: false,
      })),
      completenessScore: completenessFromAnalysis,
      completenessAtTier1: completenessFromAnalysis,
      totalGapsIdentified: gapResult.missingFields.length,
      questionsGenerated: tier2Questions.length,
    })
  } catch (error) {
    console.error("[api/report/answer] Gap analysis error:", error)

    updatedSession = await updateReportSession(updatedSession.sessionId, (s) => {
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
      warning: "Gap analysis encountered an error. You may need to retry.",
    })
  }
}

async function handleClosingAnswer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number,
): Promise<Response> {
  if (session.reportPhase !== "closing") {
    return NextResponse.json(
      { error: "Session is not in the closing phase; complete Tier 2 threshold first." },
      { status: 400 },
    )
  }

  const exists = session.closingQuestions.some((q) => q.id === questionId)
  if (!exists) {
    return NextResponse.json({ error: `Invalid closing questionId: ${questionId}` }, { status: 400 })
  }

  const trimmed = transcript.trim()
  const updated = await updateReportSession(session.sessionId, (s) => {
    s.closingAnswers[questionId] = trimmed
    s.fullNarrative = s.fullNarrative.trim() ? `${s.fullNarrative.trim()}\n\n${trimmed}` : trimmed
    s.activeDataCollectionMs += activeMs

    const answeredIds = Object.keys(s.closingAnswers).filter(
      (id) => (s.closingAnswers[id] ?? "").trim().length > 0,
    )
    const allIds = s.closingQuestions.map((q) => q.id)
    const remainingCount = allIds.filter((id) => !answeredIds.includes(id)).length
    if (remainingCount === 0) {
      s.reportPhase = "signoff"
    }
    return s
  })

  const answeredIds = Object.keys(updated.closingAnswers).filter(
    (id) => updated.closingAnswers[id]?.trim().length,
  )
  const allIds = updated.closingQuestions.map((q) => q.id)
  const remaining = allIds.filter((id) => !answeredIds.includes(id))
  const allComplete = remaining.length === 0

  return NextResponse.json({
    status: "closing_updated",
    answered: answeredIds,
    remaining,
    allClosingComplete: allComplete,
  })
}

async function handleDeferAll(session: ReportSession): Promise<Response> {
  if (session.reportPhase !== "tier2") {
    return NextResponse.json(
      { error: "Deferral is only available during Tier 2." },
      { status: 400 },
    )
  }

  const unansweredIds = session.tier2Questions
    .map((q) => q.id)
    .filter((id) => !(session.tier2Answers[id]?.trim()))

  const updated = await updateReportSession(session.sessionId, (s) => {
    s.tier2DeferredIds = [...new Set([...s.tier2DeferredIds, ...unansweredIds])]
    return s
  })

  try {
    await connectMongo()
    const { IncidentModel } = await import("@/backend/src/models/incident.model")
    await IncidentModel.updateOne(
      { id: session.incidentId, facilityId: session.facilityId },
      {
        $set: {
          completenessScore: updated.completenessScore,
          questionsDeferred: updated.tier2DeferredIds.length,
          questionsAnswered: Object.keys(updated.tier2Answers).length,
          updatedAt: new Date(),
        },
      },
    )
  } catch (err) {
    console.error("[report/answer] Failed to save deferred state to Mongo:", err)
  }

  return NextResponse.json({
    status: "deferred",
    deferredQuestionIds: unansweredIds,
    completenessScore: updated.completenessScore,
    message: "Your progress has been saved. We will remind you in 2 hours.",
  })
}

async function runWithTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function handleTier2Answer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number,
): Promise<Response> {
  if (session.reportPhase !== "tier2") {
    return NextResponse.json(
      { error: "Session is not in Tier 2; complete Tier 1 first or use the correct phase flow." },
      { status: 400 },
    )
  }
  if (!session.agentState) {
    return NextResponse.json({ error: "Report session has no analysis state" }, { status: 400 })
  }

  const question = session.tier2Questions.find((q) => q.id === questionId)
  if (!question) {
    return NextResponse.json({ error: `Invalid Tier 2 questionId: ${questionId}` }, { status: 400 })
  }

  const missingFields = collectMissingFields(session.agentState)
  const fillResult = await fillGapsWithAnswer({
    state: session.agentState,
    answerText: transcript.trim(),
    questionText: question.text,
    missingFields,
  })

  const newFullNarrative = session.fullNarrative.trim()
    ? `${session.fullNarrative.trim()}\n\n${transcript.trim()}`
    : transcript.trim()

  let mergedState: AgentState = {
    ...fillResult.state,
    global_standards: {
      ...fillResult.state.global_standards,
      staff_narrative: newFullNarrative,
    },
  }

  // Conservative deterministic normalization before generating the next gap-driven board.
  mergedState = normalizeExtractionFromNarrative(newFullNarrative, mergedState)
  const tracked = computeCompleteness(mergedState)
  mergedState = {
    ...mergedState,
    score: tracked.completenessScore,
    completenessScore: tracked.completenessScore,
    filledFields: tracked.filled,
    missingFields: tracked.missing,
  }

  const priorAskedQuestionTexts = session.tier2Questions
    .filter((q) => q.id !== questionId && session.tier2Answers[q.id]?.trim())
    .map((q) => q.text)

  const tier1Texts = tier1PromptTextsForGapAnalysis(session)
  const gapNext = await generateGapQuestions(mergedState, {
    previousQuestions: [...tier1Texts, ...priorAskedQuestionTexts, question.text],
    lastAnswer: transcript.trim(),
    maxQuestions: 12,
    responderName: session.userName || undefined,
    subtypeLabel: formatSubtypeLabel(mergedState.sub_type),
  })

  const minNext =
    gapNext.missingFields.length > 0
      ? Math.min(12, Math.max(3, gapNext.missingFields.length))
      : gapNext.questions.length

  const supplemented =
    gapNext.missingFields.length > 0
      ? supplementTier2Questions(gapNext.questions, gapNext.missingFields, minNext, 12)
      : gapNext.questions

  const { nextBoard, questionsRemoved, newQuestions } = buildNextTier2Board({
    session,
    answeredQuestionId: questionId,
    transcript,
    supplementedTexts: supplemented,
  })

  const updatedFieldsDisplay = goldFieldDisplayKeys(fillResult.updatedFields)
  const dataPointsCovered = updatedFieldsDisplay.length
  const completenessPercent = completenessToPercent(mergedState.completenessScore)

  const threshold = await getFacilityFallCompletenessThreshold(session.facilityId)
  const thresholdReached = completenessPercent >= threshold

  const finalSession = await updateReportSession(session.sessionId, (s) => {
    s.tier2Answers[questionId] = transcript.trim()
    s.fullNarrative = newFullNarrative
    s.agentState = mergedState
    s.completenessScore = completenessPercent
    s.activeDataCollectionMs += activeMs
    s.tier2Questions = nextBoard
    s.tier2QuestionsGenerated = (s.tier2QuestionsGenerated ?? 0) + newQuestions.length
    s.dataPointsPerQuestion.push({
      questionId,
      questionText: question.text,
      dataPointsCovered,
      fieldsCovered: updatedFieldsDisplay,
    })
    if (thresholdReached) {
      s.reportPhase = "closing"
    }
    return s
  })

  if (thresholdReached) {
    return NextResponse.json({
      status: "closing_ready",
      closingQuestions: CLOSING_QUESTIONS.map((q) => ({
        id: q.id,
        text: q.text,
        label: q.label,
        areaHint: q.areaHint,
        tier: q.tier,
        allowDefer: q.allowDefer,
        required: q.required,
      })),
      completenessScore: completenessPercent,
    })
  }

  const remainingQuestions = finalSession.tier2Questions
    .filter((q) => !finalSession.tier2Answers[q.id]?.trim())
    .map((q) => ({
      id: q.id,
      text: q.text,
      label: "Tier 2",
      areaHint: "Follow-up",
      tier: "tier2" as const,
      allowDefer: true,
      required: false,
    }))

  return NextResponse.json({
    status: "tier2_updated",
    questionId,
    updatedFields: updatedFieldsDisplay,
    questionsRemoved,
    newQuestions: newQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      label: "Tier 2",
      areaHint: "Follow-up",
      tier: "tier2" as const,
      allowDefer: true,
      required: false,
    })),
    remainingQuestions,
    completenessScore: completenessPercent,
    thresholdReached: false,
    dataPointsCovered,
  })
}
