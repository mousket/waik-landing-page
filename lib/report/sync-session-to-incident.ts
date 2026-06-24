import type { Question } from "@/lib/types"
import type { ReportSession } from "@/lib/config/report-session"
import type { AgentState } from "@/lib/gold_standards"
import type { Tier1Question } from "@/lib/config/tier1-questions"
import type { PendingQuestion } from "@/lib/agents/expert_investigator/session_store"
import { staffQuestionGroup } from "@/lib/staff-incident-question-group"
import { isAdminRole } from "@/lib/auth"

export type ReportQuestionDoc = {
  id: string
  incidentId?: string
  questionText: string
  askedBy: string
  askedByName?: string
  askedAt: Date
  source?: "voice-report" | "ai-generated" | "manual"
  generatedBy?: string
  metadata?: {
    reporterId?: string
    reporterName?: string
    reporterRole?: "staff" | "admin"
    createdVia?: "voice" | "text" | "system"
  }
  priority?: {
    phase: "initial" | "follow-up" | "final-critical"
    order: number
    isCritical: boolean
    goldStandardField?: string
  }
  answer?: {
    id: string
    questionId: string
    answerText: string
    answeredBy: string
    answeredAt: Date
    method: "text" | "voice"
  }
}

export interface IncidentDraftPatch {
  completenessScore: number
  completenessAtTier1Complete: number
  tier2QuestionsGenerated: number
  questionsAnswered: number
  questionsDeferred: number
  questionsMarkedUnknown: number
  activeReportSessionId: string
  activeReportPhase: string
  activeReportAgentState?: AgentState | null
  initialReport?: {
    narrative: string
    capturedAt: Date
    recordedById: string
    recordedByName: string
    recordedByRole: "staff" | "admin"
  }
}

const DEFERRED_ANSWER = "__DEFERRED__"
const UNKNOWN_ANSWER = "__UNKNOWN__"

function reporterRole(session: ReportSession): "staff" | "admin" {
  return isAdminRole(session.userRole) ? "admin" : "staff"
}

function baseMetadata(session: ReportSession) {
  return {
    reporterId: session.userId,
    reporterName: session.userName,
    reporterRole: reporterRole(session),
    createdVia: "system" as const,
  }
}

function parseAskedAt(iso: string | undefined, fallback: Date): Date {
  if (!iso) return fallback
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function resolveAnswer(
  session: ReportSession,
  questionId: string,
  tier: "tier1" | "tier2" | "closing",
): ReportQuestionDoc["answer"] | undefined {
  const deferred = tier === "tier2" && session.tier2DeferredIds.includes(questionId)
  const unknown = tier === "tier2" && session.tier2UnknownIds.includes(questionId)

  let text = ""
  if (tier === "tier1") text = session.tier1Answers[questionId]?.trim() ?? ""
  else if (tier === "tier2") text = session.tier2Answers[questionId]?.trim() ?? ""
  else text = session.closingAnswers[questionId]?.trim() ?? ""

  if (deferred) {
    return {
      id: `ans-${questionId}`,
      questionId,
      answerText: DEFERRED_ANSWER,
      answeredBy: session.userId,
      answeredAt: new Date(),
      method: "voice",
    }
  }

  if (unknown) {
    return {
      id: `ans-${questionId}`,
      questionId,
      answerText: UNKNOWN_ANSWER,
      answeredBy: session.userId,
      answeredAt: new Date(),
      method: "voice",
    }
  }

  if (!text) return undefined

  return {
    id: `ans-${questionId}`,
    questionId,
    answerText: text,
    answeredBy: session.userId,
    answeredAt: new Date(),
    method: "voice",
  }
}

function mapTier1Question(session: ReportSession, q: Tier1Question, order: number): ReportQuestionDoc {
  const askedAt = parseAskedAt(session.startedAt, new Date())
  return {
    id: q.id,
    incidentId: session.incidentId,
    questionText: q.text,
    askedBy: session.userId,
    askedByName: session.userName,
    askedAt,
    source: "voice-report",
    generatedBy: "tier-1-report",
    metadata: baseMetadata(session),
    priority: {
      phase: "initial",
      order,
      isCritical: q.required,
    },
    answer: resolveAnswer(session, q.id, "tier1"),
  }
}

function mapTier2Question(session: ReportSession, q: PendingQuestion, order: number): ReportQuestionDoc {
  const askedAt = parseAskedAt(q.askedAt, parseAskedAt(session.startedAt, new Date()))
  return {
    id: q.id,
    incidentId: session.incidentId,
    questionText: q.text,
    askedBy: session.userId,
    askedByName: session.userName,
    askedAt,
    source: "voice-report",
    generatedBy: "tier-2-gap",
    metadata: baseMetadata(session),
    priority: {
      phase: "follow-up",
      order,
      isCritical: false,
    },
    answer: resolveAnswer(session, q.id, "tier2"),
  }
}

function mapClosingQuestion(session: ReportSession, q: Tier1Question, order: number): ReportQuestionDoc {
  const askedAt = parseAskedAt(session.startedAt, new Date())
  return {
    id: q.id,
    incidentId: session.incidentId,
    questionText: q.text,
    askedBy: session.userId,
    askedByName: session.userName,
    askedAt,
    source: "voice-report",
    generatedBy: "closing-report",
    metadata: baseMetadata(session),
    priority: {
      phase: "final-critical",
      order,
      isCritical: true,
    },
    answer: resolveAnswer(session, q.id, "closing"),
  }
}

function countAnswered(session: ReportSession): number {
  const count = (rec: Record<string, string>) =>
    Object.values(rec).filter((v) => (v ?? "").trim().length > 0).length
  return count(session.tier1Answers) + count(session.tier2Answers) + count(session.closingAnswers)
}

export function buildQuestionsFromReportSession(session: ReportSession): ReportQuestionDoc[] {
  const out: ReportQuestionDoc[] = []
  session.tier1Questions.forEach((q, i) => {
    out.push(mapTier1Question(session, q, i + 1))
  })

  // The live Tier 2 board removes answered questions via buildNextTier2Board, so
  // session.tier2Questions only contains unanswered items. We reconstruct the full
  // history by merging answered questions (tracked in dataPointsPerQuestion) with
  // the current board.
  const tier2Seen = new Map<string, PendingQuestion>()

  // 1. Answered questions: dataPointsPerQuestion stores questionId + questionText for every answer
  for (const dp of session.dataPointsPerQuestion) {
    if (!tier2Seen.has(dp.questionId)) {
      tier2Seen.set(dp.questionId, {
        id: dp.questionId,
        text: dp.questionText,
        askedAt: session.startedAt ?? new Date().toISOString(),
      })
    }
  }

  // 2. Unanswered / deferred questions still on the live board
  for (const q of session.tier2Questions) {
    if (!tier2Seen.has(q.id)) {
      tier2Seen.set(q.id, q)
    }
  }

  // 3. Fallback: any answer keys not covered above (pre-dataPointsPerQuestion sessions)
  for (const qid of Object.keys(session.tier2Answers)) {
    if (!tier2Seen.has(qid)) {
      tier2Seen.set(qid, {
        id: qid,
        text: `Follow-up question ${qid}`,
        askedAt: session.startedAt ?? new Date().toISOString(),
      })
    }
  }

  let t2Order = 1
  for (const q of tier2Seen.values()) {
    out.push(mapTier2Question(session, q, t2Order++))
  }

  session.closingQuestions.forEach((q, i) => {
    out.push(mapClosingQuestion(session, q, i + 1))
  })
  return out
}

export function buildIncidentDraftFromSession(session: ReportSession): IncidentDraftPatch {
  const narrative = session.fullNarrative?.trim() ?? ""
  const patch: IncidentDraftPatch = {
    completenessScore: session.completenessScore ?? 0,
    completenessAtTier1Complete: session.completenessAtTier1 ?? 0,
    tier2QuestionsGenerated:
      session.tier2QuestionsGenerated ?? session.tier2Questions.length,
    questionsAnswered: countAnswered(session),
    questionsDeferred: session.tier2DeferredIds.length,
    questionsMarkedUnknown: session.tier2UnknownIds.length,
    activeReportSessionId: session.sessionId,
    activeReportPhase: session.reportPhase,
    activeReportAgentState: session.agentState,
  }

  if (narrative.length > 0) {
    patch.initialReport = {
      narrative,
      capturedAt: parseAskedAt(session.startedAt, new Date()),
      recordedById: session.userId,
      recordedByName: session.userName,
      recordedByRole: reporterRole(session),
    }
  }

  return patch
}

/** Validates bucket mapping for tests. */
export function questionGroupsFromSession(session: ReportSession): ReturnType<typeof staffQuestionGroup>[] {
  return buildQuestionsFromReportSession(session).map((q) =>
    staffQuestionGroup({
      id: q.id,
      questionText: q.questionText,
      askedBy: q.askedBy,
      askedAt: q.askedAt.toISOString(),
      generatedBy: q.generatedBy,
      metadata: q.metadata,
      priority: q.priority,
    } as Question),
  )
}
