import type { CurrentUser } from "@/lib/types"
import type { Question } from "@/lib/types"
import { staffQuestionGroup } from "@/lib/staff-incident-question-group"
import { sameIdsForOrMatch } from "@/lib/staff-identity"

type IdtMember = { userId?: string; status?: string }
type IncidentQuestion = {
  answer?: unknown
  assignedTo?: string[]
  metadata?: { idt?: boolean }
  generatedBy?: string
  priority?: { phase?: string }
}

type IncidentAccessDoc = {
  staffId?: string
  idtTeam?: IdtMember[]
  questions?: IncidentQuestion[]
}

export function isIncidentReporter(doc: IncidentAccessDoc, user: CurrentUser): boolean {
  const reporter = String(doc.staffId ?? "").trim()
  if (!reporter) return false
  const ids = sameIdsForOrMatch(user)
  return ids.includes(reporter)
}

/** Pending IDT roster entry or unanswered IDT question assigned to this user. */
export function hasStaffIdtAssignment(doc: IncidentAccessDoc, user: CurrentUser): boolean {
  const ids = sameIdsForOrMatch(user)
  if (ids.length === 0) return false

  const team = doc.idtTeam ?? []
  if (
    team.some(
      (m) => ids.includes(String(m.userId ?? "")) && String(m.status ?? "pending") === "pending",
    )
  ) {
    return true
  }

  return (doc.questions ?? []).some(
    (q) =>
      Boolean(q.metadata?.idt) &&
      (q.assignedTo ?? []).some((id) => ids.includes(String(id))) &&
      !q.answer,
  )
}

export function staffCanReadIncident(doc: IncidentAccessDoc, user: CurrentUser): boolean {
  if (user.isAdminTier || user.isWaikSuperAdmin) return true
  return isIncidentReporter(doc, user) || hasStaffIdtAssignment(doc, user)
}

/** Placeholder answers from defer / unknown flows — still need a real response. */
export const PLACEHOLDER_ANSWER_TEXTS = new Set(["__DEFERRED__", "__UNKNOWN__"])

export function answerTextFromQuestion(q: IncidentQuestion): string {
  const answer = q.answer
  if (answer == null) return ""
  if (typeof answer === "object" && "answerText" in answer) {
    return String((answer as { answerText?: string }).answerText ?? "").trim()
  }
  return ""
}

/** Matches detail view: deferred/unknown are not treated as answered. */
export function isQuestionSubstantivelyAnswered(q: IncidentQuestion): boolean {
  const text = answerTextFromQuestion(q)
  if (!text.length) return false
  return !PLACEHOLDER_ANSWER_TEXTS.has(text)
}

export function isQuestionDeferred(q: IncidentQuestion): boolean {
  return PLACEHOLDER_ANSWER_TEXTS.has(answerTextFromQuestion(q))
}

export function isQuestionUnanswered(q: IncidentQuestion): boolean {
  return answerTextFromQuestion(q).length === 0
}

export type ReporterPendingBreakdown = {
  /** Blocks sign-off: unanswered + deferred across tiers. */
  total: number
  tier1: number
  /** Tier 2 still needing a substantive answer (unanswered + deferred). */
  tier2: number
  tier2Unanswered: number
  tier2Deferred: number
  closing: number
  /** True once at least one Tier 2 question exists on the incident (gap analysis has run). */
  tier2Generated: boolean
}

/** Reporter workload across Tier 1, Tier 2, and closing. */
export function countReporterPendingBreakdown(
  doc: IncidentAccessDoc,
  user: CurrentUser,
  phase: string,
): ReporterPendingBreakdown {
  const empty: ReporterPendingBreakdown = {
    total: 0,
    tier1: 0,
    tier2: 0,
    tier2Unanswered: 0,
    tier2Deferred: 0,
    closing: 0,
    tier2Generated: false,
  }
  if (!isIncidentReporter(doc, user) || phase !== "phase_1_in_progress") {
    return empty
  }

  let tier1 = 0
  let tier2Unanswered = 0
  let tier2Deferred = 0
  let closing = 0
  let tier2Generated = false

  for (const q of doc.questions ?? []) {
    if (q.metadata?.idt) continue
    const group = staffQuestionGroup(q as Question)
    if (group === "tier2") tier2Generated = true
    if (isQuestionSubstantivelyAnswered(q)) continue
    if (group === "tier1") tier1 += 1
    else if (group === "tier2") {
      if (isQuestionDeferred(q)) tier2Deferred += 1
      else tier2Unanswered += 1
    } else if (group === "closing") closing += 1
  }

  const tier2 = tier2Unanswered + tier2Deferred
  return {
    total: tier1 + tier2 + closing,
    tier1,
    tier2,
    tier2Unanswered,
    tier2Deferred,
    closing,
    tier2Generated,
  }
}

export function countPendingQuestionsForStaff(
  doc: IncidentAccessDoc,
  user: CurrentUser,
  phase: string,
): number {
  const ids = sameIdsForOrMatch(user)
  const questions = doc.questions ?? []
  let n = 0

  if (isIncidentReporter(doc, user) && phase === "phase_1_in_progress") {
    n += countReporterPendingBreakdown(doc, user, phase).total
  }

  if (ids.length > 0) {
    n += questions.filter(
      (q) =>
        Boolean(q.metadata?.idt) &&
        (q.assignedTo ?? []).some((id) => ids.includes(String(id))) &&
        !isQuestionSubstantivelyAnswered(q),
    ).length
  }

  return n
}
