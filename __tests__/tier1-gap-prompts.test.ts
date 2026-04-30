import { describe, expect, it } from "vitest"
import { FALL_TIER1_QUESTIONS } from "@/lib/config/tier1-questions"
import { tier1PromptTextsForGapAnalysis } from "@/lib/report/tier1-gap-prompts"

describe("tier1PromptTextsForGapAnalysis", () => {
  it("returns trimmed Tier 1 question texts in order", () => {
    const prompts = tier1PromptTextsForGapAnalysis({ tier1Questions: FALL_TIER1_QUESTIONS })
    expect(prompts.length).toBe(FALL_TIER1_QUESTIONS.length)
    expect(prompts).toEqual(FALL_TIER1_QUESTIONS.map((q) => q.text.trim()))
  })

  it("drops whitespace-only prompts", () => {
    const prompts = tier1PromptTextsForGapAnalysis({
      tier1Questions: [
        {
          id: "x",
          text: "  \t  ",
          label: "X",
          areaHint: "",
          tier: "tier1",
          allowDefer: false,
          required: false,
        },
      ],
    })
    expect(prompts).toEqual([])
  })
})
