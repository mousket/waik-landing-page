import type { ReportSession } from "@/lib/config/report-session"

/**
 * Tier 1 question prompts passed to gap generation (`previousQuestions`) so Tier 2 wording
 * can avoid repeating the same staffed Tier 1 question copy verbatim.
 */
export function tier1PromptTextsForGapAnalysis(session: Pick<ReportSession, "tier1Questions">): string[] {
  return session.tier1Questions.map((q) => q.text.trim()).filter((t) => t.length > 0)
}
