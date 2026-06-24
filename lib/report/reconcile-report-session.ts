import type { IncidentDocument } from "@/backend/src/models/incident.model"
import type { Question } from "@/lib/types"
import { staffQuestionGroup } from "@/lib/staff-incident-question-group"
import type { ReportPhase, ReportSession } from "@/lib/config/report-session"
import type { PendingQuestion } from "@/lib/agents/expert_investigator/session_store"
import { isSubstantiveTier2AnswerText } from "@/lib/report/tier2-stable-board"

const DEFERRED = "__DEFERRED__"

function incidentQuestionAsQuestion(q: IncidentDocument["questions"][number]): Question {
  return {
    id: q.id,
    questionText: q.questionText,
    askedBy: q.askedBy,
    askedAt: q.askedAt instanceof Date ? q.askedAt.toISOString() : String(q.askedAt),
    generatedBy: q.generatedBy,
    metadata: q.metadata,
    priority: q.priority,
  } as Question
}

function pendingTier2FromIncident(incident: IncidentDocument): PendingQuestion[] {
  const out: PendingQuestion[] = []
  for (const q of incident.questions ?? []) {
    const group = staffQuestionGroup(incidentQuestionAsQuestion(q))
    if (group !== "tier2") continue
    const text = q.answer?.answerText?.trim() ?? ""
    if (isSubstantiveTier2AnswerText(text)) continue
    out.push({
      id: q.id,
      text: q.questionText,
      askedAt:
        q.askedAt instanceof Date ? q.askedAt.toISOString() : new Date().toISOString(),
    })
  }
  return out
}

function deferredTier2IdsFromIncident(incident: IncidentDocument): string[] {
  const ids: string[] = []
  for (const q of incident.questions ?? []) {
    const group = staffQuestionGroup(incidentQuestionAsQuestion(q))
    if (group !== "tier2") continue
    const text = q.answer?.answerText?.trim() ?? ""
    if (text === DEFERRED) ids.push(q.id)
  }
  return ids
}

/** Derive the correct report phase from session contents (ignores stale `reportPhase`). */
export function reconcileReportPhase(session: ReportSession): ReportPhase {
  const tier1Complete = session.tier1Questions.every(
    (q) => (session.tier1Answers[q.id]?.trim().length ?? 0) > 0,
  )
  if (!tier1Complete) return "tier1"

  const pendingTier2 = session.tier2Questions.some(
    (q) => !isSubstantiveTier2AnswerText(session.tier2Answers[q.id]),
  )
  if (pendingTier2) return "tier2"

  const closingComplete = session.closingQuestions.every(
    (q) => (session.closingAnswers[q.id]?.trim().length ?? 0) > 0,
  )
  if (!closingComplete) return "closing"

  return "signoff"
}

/**
 * Merge unanswered / deferred Tier 2 questions from Mongo into the live Redis board
 * and correct a stale `reportPhase` (e.g. session at closing while follow-ups remain).
 */
export function reconcileReportSession(
  session: ReportSession,
  incident?: IncidentDocument | null,
): { session: ReportSession; changed: boolean } {
  let next: ReportSession = session
  let changed = false

  if (incident) {
    const pendingFromIncident = pendingTier2FromIncident(incident)
    const boardIds = new Set(next.tier2Questions.map((q) => q.id))
    const mergedBoard = [...next.tier2Questions]
    for (const q of pendingFromIncident) {
      if (!boardIds.has(q.id)) {
        mergedBoard.push(q)
        boardIds.add(q.id)
      }
    }

    const deferredFromIncident = deferredTier2IdsFromIncident(incident)
    const mergedDeferred = [...new Set([...next.tier2DeferredIds, ...deferredFromIncident])]

    if (
      mergedBoard.length !== next.tier2Questions.length ||
      mergedDeferred.length !== next.tier2DeferredIds.length
    ) {
      next = {
        ...next,
        tier2Questions: mergedBoard,
        tier2DeferredIds: mergedDeferred,
      }
      changed = true
    }
  }

  const reconciledPhase = reconcileReportPhase(next)
  if (reconciledPhase !== next.reportPhase) {
    next = { ...next, reportPhase: reconciledPhase }
    changed = true
  }

  return { session: next, changed }
}
