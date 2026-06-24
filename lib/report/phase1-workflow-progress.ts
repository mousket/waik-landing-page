import type { Question } from "@/lib/types"
import { staffQuestionGroup } from "@/lib/staff-incident-question-group"
import { isQuestionSubstantivelyAnswered } from "@/lib/staff-incident-access"
import type { ReportSession } from "@/lib/config/report-session"
import { CLOSING_QUESTIONS } from "@/lib/config/tier1-questions"

/** Phase 1 workflow weights (sum to 100 across full incident lifecycle). */
const WEIGHT_TIER1 = 25
const WEIGHT_TIER2 = 45
const WEIGHT_CLOSING = 15
const WEIGHT_SIGNOFF = 10
const WEIGHT_PHASE2 = 5

export type Phase1WorkflowCounts = {
  tier1Total: number
  tier1Answered: number
  tier2Generated: boolean
  tier2Total: number
  tier2Answered: number
  closingTotal: number
  closingAnswered: number
}

export function countPhase1WorkflowFromQuestions(questions: Question[]): Phase1WorkflowCounts {
  let tier1Total = 0
  let tier1Answered = 0
  let tier2Total = 0
  let tier2Answered = 0
  let closingTotal = 0
  let closingAnswered = 0
  let tier2Generated = false

  for (const q of questions) {
    if (q.metadata?.idt) continue
    const group = staffQuestionGroup(q)
    const answered = isQuestionSubstantivelyAnswered(q)
    if (group === "tier1") {
      tier1Total += 1
      if (answered) tier1Answered += 1
    } else if (group === "tier2") {
      tier2Generated = true
      tier2Total += 1
      if (answered) tier2Answered += 1
    } else if (group === "closing") {
      closingTotal += 1
      if (answered) closingAnswered += 1
    }
  }

  return {
    tier1Total,
    tier1Answered,
    tier2Generated,
    tier2Total,
    tier2Answered,
    closingTotal,
    closingAnswered,
  }
}

export function countPhase1WorkflowFromSession(session: ReportSession): Phase1WorkflowCounts {
  const tier1Total = session.tier1Questions.length
  const tier1Answered = session.tier1Questions.filter(
    (q) => (session.tier1Answers[q.id]?.trim().length ?? 0) > 0,
  ).length

  const tier2BoardIds = new Set(session.tier2Questions.map((q) => q.id))
  const tier2AnsweredIds = new Set(
    Object.entries(session.tier2Answers)
      .filter(([, text]) => isQuestionSubstantivelyAnswered({ answer: { answerText: text } }))
      .map(([id]) => id),
  )
  for (const row of session.dataPointsPerQuestion) {
    tier2AnsweredIds.add(row.questionId)
    tier2BoardIds.add(row.questionId)
  }
  for (const id of Object.keys(session.tier2Answers)) {
    tier2BoardIds.add(id)
  }

  const tier2Total = tier2BoardIds.size
  const tier2Answered = tier2AnsweredIds.size
  const tier2Generated =
    (session.tier2QuestionsGenerated ?? 0) > 0 || tier2Total > 0 || session.agentState != null

  const closingTotal = session.closingQuestions.length || CLOSING_QUESTIONS.length
  const closingAnswered = session.closingQuestions.filter(
    (q) => (session.closingAnswers[q.id]?.trim().length ?? 0) > 0,
  ).length

  return {
    tier1Total,
    tier1Answered,
    tier2Generated,
    tier2Total,
    tier2Answered,
    closingTotal,
    closingAnswered,
  }
}

export function computePhase1WorkflowPercent(
  counts: Phase1WorkflowCounts,
  phase: string,
): number {
  if (phase === "closed") return 100
  if (phase === "phase_2_in_progress") return 100 - WEIGHT_PHASE2
  if (phase === "phase_1_complete") {
    return WEIGHT_TIER1 + WEIGHT_TIER2 + WEIGHT_CLOSING + WEIGHT_SIGNOFF
  }

  const tier1Share =
    counts.tier1Total > 0 ? (counts.tier1Answered / counts.tier1Total) * WEIGHT_TIER1 : 0

  const tier2Share =
    counts.tier2Generated && counts.tier2Total > 0
      ? (counts.tier2Answered / counts.tier2Total) * WEIGHT_TIER2
      : 0

  const closingShare =
    counts.closingTotal > 0
      ? (counts.closingAnswered / counts.closingTotal) * WEIGHT_CLOSING
      : 0

  return Math.round(Math.min(90, tier1Share + tier2Share + closingShare))
}

function substantiveAnswerText(text: string | undefined): boolean {
  const t = (text ?? "").trim()
  if (!t.length) return false
  return !PLACEHOLDER_ANSWER_TEXTS.has(t)
}

const PLACEHOLDER_ANSWER_TEXTS = new Set(["__DEFERRED__", "__UNKNOWN__"])

/** Client report page: boards + answer map (answered Tier 2 cards leave the live board). */
export function computeWorkflowFromAnswerMap(input: {
  tier1Ids: string[]
  tier2Ids: string[]
  closingIds: string[]
  answers: Record<string, string>
  tier2Generated: boolean
  phase?: string
}): number {
  const tier1Answered = input.tier1Ids.filter((id) =>
    substantiveAnswerText(input.answers[id]),
  ).length
  const tier2Answered = input.tier2Ids.filter((id) =>
    substantiveAnswerText(input.answers[id]),
  ).length
  const closingAnswered = input.closingIds.filter((id) =>
    substantiveAnswerText(input.answers[id]),
  ).length

  return computePhase1WorkflowPercent(
    {
      tier1Total: input.tier1Ids.length,
      tier1Answered,
      tier2Generated: input.tier2Generated,
      tier2Total: input.tier2Ids.length,
      tier2Answered,
      closingTotal: input.closingIds.length,
      closingAnswered,
    },
    input.phase ?? "phase_1_in_progress",
  )
}
