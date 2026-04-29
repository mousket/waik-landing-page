/**
 * POST /api/report/answer — incident reporting answer router.
 *
 * Dispatches by `tier`. This task (IR-1b) implements the **tier1** branch:
 * persist the transcript to the Redis session, grow `fullNarrative`,
 * accumulate `activeDataCollectionMs`, and — when every Tier 1 question is
 * answered — trigger gap analysis through the expert investigator pipeline
 * to produce the Tier 2 question board.
 *
 * Tier 2 and closing branches are added by IR-1c and IR-1d. See
 * documentation/pilot_1_plan/incident_report/WAiK_Incident_Reporting_Blueprint.md §2.
 */

import { NextResponse } from "next/server"

import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { analyzeNarrativeAndScore } from "@/lib/agents/expert_investigator/analyze"
import {
  generateGapQuestions,
  type MissingFieldDescriptor,
} from "@/lib/agents/expert_investigator/gap_questions"
import {
  getReportSession,
  updateReportSession,
  type ReportBoardQuestion,
  type ReportSession,
} from "@/lib/config/report-session"

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

  if (tier === "tier1") {
    return handleTier1Answer(
      session,
      questionId,
      typeof transcript === "string" ? transcript : "",
      Number.isFinite(activeMs) ? Number(activeMs) : 0,
      session.userName ?? "",
    )
  }

  // tier2 / closing wired in IR-1c and IR-1d
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
