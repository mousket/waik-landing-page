import { differenceInHours, parseISO } from "date-fns"

import type { Question } from "@/lib/types"

/** IDT “remind” is offered when a question was sent &gt; 24h ago and still has no answer. */
export function isIdtQuestionOverdueForReminder(askedAtIso: string, now: Date = new Date()): boolean {
  const t = parseISO(askedAtIso)
  if (Number.isNaN(t.getTime())) return false
  return differenceInHours(now, t) >= 24
}

export function filterIdtQuestions(questions: Question[]): Question[] {
  return questions.filter((q) => q.metadata?.idt === true)
}

export function idtOpenQuestionCountForUser(questions: Question[], userId: string): number {
  return questions.filter(
    (q) => q.metadata?.idt && q.assignedTo?.includes(userId) && !q.answer,
  ).length
}
