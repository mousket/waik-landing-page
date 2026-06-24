import type { PendingQuestion } from "@/lib/agents/expert_investigator/session_store"
import type { ReportSession } from "@/lib/config/report-session"

/**
 * Phase 11d — Option A: stable Tier 2 queue.
 * Answering removes only the touched card; the rest of the board is unchanged.
 */

export type StableTier2AnswerResult = {
  nextBoard: PendingQuestion[]
  /** True when no follow-up cards remain (all answered or removed from live board). */
  readyForClosing: boolean
  removedQuestionId: string
}

export function applyStableTier2Answer(input: {
  session: ReportSession
  answeredQuestionId: string
}): StableTier2AnswerResult {
  const nextBoard = input.session.tier2Questions.filter((q) => q.id !== input.answeredQuestionId)
  return {
    nextBoard,
    readyForClosing: nextBoard.length === 0,
    removedQuestionId: input.answeredQuestionId,
  }
}

/** Live board = Tier 2 questions not yet substantively answered (deferred stay on board). */
export function isSubstantiveTier2AnswerText(text: string | undefined | null): boolean {
  const t = (text ?? "").trim()
  if (!t.length) return false
  return t !== "__DEFERRED__" && t !== "__UNKNOWN__"
}
