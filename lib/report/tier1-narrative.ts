import type { ReportSession } from "@/lib/config/report-session"

/** Ordered Tier 1 narrative; recomputing avoids duplicate paragraphs when a question is re-recorded. */
export function buildTier1Narrative(s: ReportSession): string {
  return s.tier1Questions
    .map((q) => s.tier1Answers[q.id]?.trim())
    .filter((block): block is string => Boolean(block && block.length > 0))
    .join("\n\n")
}

export function tier1AnsweredIds(s: ReportSession): string[] {
  return s.tier1Questions
    .map((q) => q.id)
    .filter((id) => (s.tier1Answers[id]?.trim().length ?? 0) > 0)
}

export function tier1ProgressScore(s: ReportSession): number {
  const n = s.tier1Questions.length
  if (n <= 0) return 0
  return Math.round((tier1AnsweredIds(s).length / n) * 100)
}
