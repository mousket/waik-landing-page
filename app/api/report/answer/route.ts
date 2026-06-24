import connectMongo from "@/backend/src/lib/mongodb"
import { NextResponse } from "next/server"
import { computeCompleteness } from "@/lib/agents/expert_investigator/analyze"
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
  completenessToPercent,
  formatSubtypeLabel,
  goldFieldDisplayKeys,
} from "@/lib/report/tier2-board"
import {
  ensureSessionAgentState,
  seedAgentStateFromReport,
} from "@/lib/report/agent-state-from-session"
import { applyStableTier2Answer, isSubstantiveTier2AnswerText } from "@/lib/report/tier2-stable-board"
import { normalizeExtractionFromNarrative } from "@/lib/agents/expert_investigator/extraction-normalizer"
import {
  buildTier1Narrative,
  tier1AnsweredIds,
  tier1ProgressScore,
} from "@/lib/report/tier1-narrative"
import { tier1PromptTextsForGapAnalysis } from "@/lib/report/tier1-gap-prompts"
import { runTier1GapAnalysis } from "@/lib/report/run-tier1-gap-analysis"
import { persistReportCheckpoint } from "@/lib/report/checkpoint-incident"
import { upsertAnswerEmbedding } from "@/lib/agents/answer-embedding-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const GAP_ANALYSIS_TIMEOUT_MS = 45_000

async function saveReportSession(
  sessionId: string,
  updater: (s: ReportSession) => ReportSession,
): Promise<ReportSession> {
  const updated = await updateReportSession(sessionId, updater)
  await persistReportCheckpoint(updated)
  return updated
}

function mapGapStringsToTier2Pending(questions: string[]): PendingQuestion[] {
  const askedAt = new Date().toISOString()
  return questions.map((text, i) => ({
    id: `t2-q${i + 1}`,
    text,
    askedAt,
  }))
}

function tier2BoardPayload(questions: PendingQuestion[]) {
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    label: "Tier 2",
    areaHint: "Follow-up",
    tier: "tier2" as const,
    allowDefer: true,
    required: false,
  }))
}

function fireAnswerEmbedding(
  session: ReportSession,
  questionId: string,
  questionText: string,
  answerText: string,
  tier: "tier1" | "tier2" | "closing",
  areaHint: string,
): void {
  void upsertAnswerEmbedding({
    incidentId: session.incidentId,
    facilityId: session.facilityId,
    questionId,
    questionText,
    answerText,
    tier,
    areaHint: areaHint || "General",
    incidentType: session.incidentType,
    residentName: session.residentName,
    residentRoom: session.residentRoom,
  }).catch((err) => console.warn("[report/answer] Answer embedding failed:", err))
}

function gapOptionsForSession(session: ReportSession) {
  return {
    maxQuestions: 15,
    responderName: session.userName || undefined,
    previousQuestions: tier1PromptTextsForGapAnalysis(session),
    subtypeLabel: formatSubtypeLabel(session.agentState?.sub_type ?? null),
  }
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
  const questionText = typeof body.questionText === "string" ? body.questionText.trim() : ""
  const areaHint = typeof body.areaHint === "string" ? body.areaHint.trim() : ""

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

  if (questionId === "__RETRY_GAP__") {
    return handleRetryGapAnalysis(session)
  }

  if (questionId === "__DEFER_ONE__") {
    if (tier !== "tier2") {
      return NextResponse.json(
        { error: 'Deferral requires tier: "tier2"' },
        { status: 400 },
      )
    }
    const deferQuestionId =
      typeof body.deferQuestionId === "string" ? body.deferQuestionId.trim() : ""
    if (!deferQuestionId) {
      return NextResponse.json({ error: "deferQuestionId required" }, { status: 400 })
    }
    return handleDeferOne(session, deferQuestionId)
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
    return handleTier1Answer(session, questionId, transcript, activeMs, questionText, areaHint)
  }
  if (tier === "tier2") {
    return handleTier2Answer(session, questionId, transcript, activeMs, questionText, areaHint)
  }
  if (tier === "closing") {
    return handleClosingAnswer(session, questionId, transcript, activeMs, questionText, areaHint)
  }

  return NextResponse.json({ error: `Tier "${String(tier)}" not supported` }, { status: 400 })
}

async function handleTier1Answer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number,
  questionText: string,
  areaHint: string,
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

  let updatedSession = await saveReportSession(session.sessionId, (s) => {
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

  const tier1Question = session.tier1Questions.find((q) => q.id === questionId)
  const resolvedQuestionText = questionText || tier1Question?.text || ""
  const resolvedAreaHint = areaHint || tier1Question?.areaHint || "Narrative"

  fireAnswerEmbedding(
    session,
    questionId,
    resolvedQuestionText,
    transcript.trim(),
    "tier1",
    resolvedAreaHint,
  )

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

  return runGapAnalysisAndRespond(updatedSession)
}

async function executeTier1GapAnalysis(session: ReportSession) {
  const narrative = session.fullNarrative?.trim() ?? ""
  if (!narrative) {
    throw new Error("No narrative to analyze")
  }
  return runWithTimeout(
    runTier1GapAnalysis(narrative, seedAgentStateFromReport(session), gapOptionsForSession(session)),
    GAP_ANALYSIS_TIMEOUT_MS,
    "gap_analysis",
  )
}

function gapAnalysisFailurePayload(warning: string) {
  return {
    status: "gap_analysis_complete",
    tier2Questions: [] as ReturnType<typeof tier2BoardPayload>,
    completenessScore: 0,
    completenessAtTier1: 0,
    totalGapsIdentified: 0,
    questionsGenerated: 0,
    warning,
    retryable: true,
  }
}

async function runGapAnalysisAndRespond(
  session: ReportSession,
  options?: { rethrowOnFailure?: boolean },
): Promise<Response> {
  try {
    const { analysisResult, gapResult } = await executeTier1GapAnalysis(session)
    const tier2Questions = mapGapStringsToTier2Pending(gapResult.questions)
    const completenessFromAnalysis = completenessToPercent(analysisResult.completenessScore)

    await saveReportSession(session.sessionId, (s) => {
      s.reportPhase = "tier2"
      s.tier1CompletedAt = s.tier1CompletedAt ?? new Date().toISOString()
      s.agentState = analysisResult.state
      s.tier2Questions = tier2Questions
      s.completenessScore = completenessFromAnalysis
      s.completenessAtTier1 = completenessFromAnalysis
      s.tier2QuestionsGenerated = tier2Questions.length
      return s
    })

    const payload: Record<string, unknown> = {
      status: "gap_analysis_complete",
      tier2Questions: tier2BoardPayload(tier2Questions),
      completenessScore: completenessFromAnalysis,
      completenessAtTier1: completenessFromAnalysis,
      totalGapsIdentified: gapResult.missingFields.length,
      questionsGenerated: tier2Questions.length,
    }
    if (tier2Questions.length === 0) {
      payload.warning =
        "We could not generate follow-up questions. Check your connection and tap Retry."
      payload.retryable = true
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("[api/report/answer] Gap analysis error:", error)

    await saveReportSession(session.sessionId, (s) => {
      s.reportPhase = "tier2"
      s.tier1CompletedAt = s.tier1CompletedAt ?? new Date().toISOString()
      s.tier2Questions = []
      return s
    })

    if (options?.rethrowOnFailure) {
      throw error
    }

    return NextResponse.json(
      gapAnalysisFailurePayload(
        "Gap analysis encountered an error. Check your connection and try again.",
      ),
    )
  }
}

async function handleRetryGapAnalysis(session: ReportSession): Promise<Response> {
  const narrative = session.fullNarrative?.trim() ?? ""
  if (!narrative) {
    return NextResponse.json({ error: "No narrative to analyze" }, { status: 400 })
  }

  const tier1Complete =
    Boolean(session.tier1CompletedAt) ||
    tier1AnsweredIds(session).length >= session.tier1Questions.length

  if (!tier1Complete) {
    return NextResponse.json({ error: "Complete Tier 1 before retrying gap analysis" }, { status: 400 })
  }

  if (session.reportPhase !== "tier2" && session.reportPhase !== "tier1") {
    return NextResponse.json({ error: "Gap retry is not available for this session phase" }, { status: 400 })
  }

  try {
    return await runGapAnalysisAndRespond(session, { rethrowOnFailure: true })
  } catch (error) {
    console.error("[api/report/answer] Gap retry error:", error)
    return NextResponse.json(
      {
        error: "Could not regenerate follow-up questions. Try again shortly.",
        retryable: true,
      },
      { status: 503 },
    )
  }
}

async function handleClosingAnswer(
  session: ReportSession,
  questionId: string,
  transcript: string,
  activeMs: number,
  questionText: string,
  areaHint: string,
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
  const updated = await saveReportSession(session.sessionId, (s) => {
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

  const closingQuestion = session.closingQuestions.find((q) => q.id === questionId)
  fireAnswerEmbedding(
    session,
    questionId,
    questionText || closingQuestion?.text || "",
    trimmed,
    "closing",
    areaHint || closingQuestion?.areaHint || "Closing",
  )

  return NextResponse.json({
    status: "closing_updated",
    answered: answeredIds,
    remaining,
    allClosingComplete: allComplete,
  })
}

async function markTier2DeferredOnIncident(session: ReportSession): Promise<void> {
  try {
    await connectMongo()
    const { default: IncidentModel } = await import("@/backend/src/models/incident.model")
    await IncidentModel.updateOne(
      { id: session.incidentId, facilityId: session.facilityId },
      {
        $set: {
          tier2DeferredAt: new Date(),
          tier2Reminder2hSentAt: null,
          tier2Reminder4hSentAt: null,
          tier2EscalationSentAt: null,
          updatedAt: new Date(),
        },
      },
    ).exec()
  } catch (err) {
    console.error("[report/answer] Failed to save deferred timestamps to Mongo:", err)
  }
}

async function handleDeferOne(
  session: ReportSession,
  deferQuestionId: string,
): Promise<Response> {
  if (session.reportPhase !== "tier2") {
    return NextResponse.json(
      { error: "Deferral is only available during Tier 2." },
      { status: 400 },
    )
  }

  const question = session.tier2Questions.find((q) => q.id === deferQuestionId)
  if (!question) {
    return NextResponse.json(
      { error: `Invalid Tier 2 questionId: ${deferQuestionId}` },
      { status: 400 },
    )
  }
  if (isSubstantiveTier2AnswerText(session.tier2Answers[deferQuestionId])) {
    return NextResponse.json({ error: "Question is already answered." }, { status: 400 })
  }

  const updated = await saveReportSession(session.sessionId, (s) => {
    s.tier2DeferredIds = [...new Set([...s.tier2DeferredIds, deferQuestionId])]
    return s
  })

  await markTier2DeferredOnIncident(session)

  return NextResponse.json({
    status: "deferred",
    deferredQuestionId: deferQuestionId,
    deferredQuestionIds: [deferQuestionId],
    completenessScore: updated.completenessScore,
    message: "Question deferred. Continue other follow-ups or return when ready.",
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
    .filter(
      (id) =>
        !session.tier2DeferredIds.includes(id) &&
        !isSubstantiveTier2AnswerText(session.tier2Answers[id]),
    )

  const updated = await saveReportSession(session.sessionId, (s) => {
    s.tier2DeferredIds = [...new Set([...s.tier2DeferredIds, ...unansweredIds])]
    return s
  })

  await markTier2DeferredOnIncident(session)

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
  questionText: string,
  areaHint: string,
): Promise<Response> {
  if (session.reportPhase !== "tier2") {
    return NextResponse.json(
      { error: "Session is not in Tier 2; complete Tier 1 first or use the correct phase flow." },
      { status: 400 },
    )
  }
  const baseAgentState = ensureSessionAgentState(session)
  if (!baseAgentState) {
    return NextResponse.json(
      { error: "Report session has no analysis state. Resume the report from your dashboard and try again." },
      { status: 400 },
    )
  }

  const question = session.tier2Questions.find((q) => q.id === questionId)
  if (!question) {
    return NextResponse.json({ error: `Invalid Tier 2 questionId: ${questionId}` }, { status: 400 })
  }

  const missingFields = collectMissingFields(baseAgentState)
  const fillResult = await fillGapsWithAnswer({
    state: baseAgentState,
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

  // Update agentState for completeness display; board uses stable queue (phase 11d).
  mergedState = normalizeExtractionFromNarrative(newFullNarrative, mergedState)
  const tracked = computeCompleteness(mergedState)
  mergedState = {
    ...mergedState,
    score: tracked.completenessScore,
    completenessScore: tracked.completenessScore,
    filledFields: tracked.filled,
    missingFields: tracked.missing,
  }

  const { nextBoard, readyForClosing, removedQuestionId } = applyStableTier2Answer({
    session,
    answeredQuestionId: questionId,
  })

  const updatedFieldsDisplay = goldFieldDisplayKeys(fillResult.updatedFields)
  const dataPointsCovered = updatedFieldsDisplay.length
  const completenessPercent = completenessToPercent(mergedState.completenessScore)

  const finalSession = await saveReportSession(session.sessionId, (s) => {
    s.tier2Answers[questionId] = transcript.trim()
    s.tier2DeferredIds = s.tier2DeferredIds.filter((id) => id !== questionId)
    s.tier2UnknownIds = s.tier2UnknownIds.filter((id) => id !== questionId)
    s.fullNarrative = newFullNarrative
    s.agentState = mergedState
    s.completenessScore = completenessPercent
    s.activeDataCollectionMs += activeMs
    s.tier2Questions = nextBoard
    s.dataPointsPerQuestion.push({
      questionId,
      questionText: question.text,
      dataPointsCovered,
      fieldsCovered: updatedFieldsDisplay,
    })
    if (readyForClosing) {
      s.reportPhase = "closing"
    }
    return s
  })

  fireAnswerEmbedding(
    session,
    questionId,
    questionText || question.text,
    transcript.trim(),
    "tier2",
    areaHint || "Follow-up",
  )

  try {
    await connectMongo()
    const { IncidentModel } = await import("@/backend/src/models/incident.model")
    const deferredOnBoard = finalSession.tier2Questions.filter((q) =>
      finalSession.tier2DeferredIds.includes(q.id),
    ).length

    await IncidentModel.updateOne(
      { id: session.incidentId, facilityId: session.facilityId },
      {
        $set: {
          completenessScore: completenessPercent,
          activeReportPhase: readyForClosing ? "closing" : "tier2",
          questionsAnswered: Object.keys(finalSession.tier2Answers).length,
          questionsDeferred: deferredOnBoard,
          ...(readyForClosing
            ? {
                tier2DeferredAt: null,
                tier2Reminder2hSentAt: null,
                tier2Reminder4hSentAt: null,
                tier2EscalationSentAt: null,
              }
            : {}),
          updatedAt: new Date(),
        },
      },
    )
  } catch (err) {
    console.error("[report/answer] tier2 incident sync failed:", err)
  }

  if (readyForClosing) {
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
    questionsRemoved: [removedQuestionId],
    newQuestions: [],
    remainingQuestions,
    completenessScore: completenessPercent,
    thresholdReached: false,
    dataPointsCovered,
  })
}
