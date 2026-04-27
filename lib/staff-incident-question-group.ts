import type { Question } from "@/lib/types"

export type StaffQuestionGroup = "tier1" | "tier2" | "closing" | "idt"

type QuestionEx = Question & { priority?: { phase?: string } }

/**
 * Heuristic bucketing for staff incident tabs (no single mandatory schema in DB).
 */
export function staffQuestionGroup(q: Question): StaffQuestionGroup {
  const m = (q as QuestionEx).metadata
  if (m?.idt) return "idt"
  const g = String((q as Question & { generatedBy?: string }).generatedBy ?? "")
  const phase = (q as QuestionEx).priority?.phase
  if (phase === "final-critical" || g.includes("final") || g.includes("closing") || g.includes("beta-interview-final")) {
    return "closing"
  }
  if (g.toLowerCase().includes("tier-2") || g.toLowerCase().includes("tier2")) {
    return "tier2"
  }
  return "tier1"
}

export const GROUP_LABEL: Record<StaffQuestionGroup, string> = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  closing: "Closing",
  idt: "DON follow-up",
}
