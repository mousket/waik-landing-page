import { describe, it, expect } from "vitest"

import {
  CLOSING_QUESTIONS,
  FALL_TIER1_QUESTIONS,
  TIER1_BY_TYPE,
  type Tier1Question,
} from "@/lib/config/tier1-questions"

describe("tier1-questions config", () => {
  it("FALL_TIER1_QUESTIONS has 5 entries with sequential ids and required tier1 flags", () => {
    expect(FALL_TIER1_QUESTIONS).toHaveLength(5)

    const expectedIds = ["t1-q1", "t1-q2", "t1-q3", "t1-q4", "t1-q5"]
    expect(FALL_TIER1_QUESTIONS.map((q) => q.id)).toEqual(expectedIds)

    for (const q of FALL_TIER1_QUESTIONS) {
      expect(q.tier).toBe("tier1")
      expect(q.allowDefer).toBe(false)
      expect(q.required).toBe(true)
      expect(q.text.trim().length).toBeGreaterThan(0)
      expect(q.label.trim().length).toBeGreaterThan(0)
      expect(q.areaHint.trim().length).toBeGreaterThan(0)
    }
  })

  it("FALL_TIER1_QUESTIONS covers the five area hints from the blueprint", () => {
    const hints = FALL_TIER1_QUESTIONS.map((q) => q.areaHint)
    expect(hints).toEqual([
      "Narrative",
      "Resident Statement",
      "Interventions",
      "Environment",
      "Root Cause",
    ])
  })

  it("CLOSING_QUESTIONS has 3 required, non-deferrable entries", () => {
    expect(CLOSING_QUESTIONS).toHaveLength(3)
    expect(CLOSING_QUESTIONS.map((q) => q.id)).toEqual(["c-q1", "c-q2", "c-q3"])

    for (const q of CLOSING_QUESTIONS) {
      expect(q.tier).toBe("closing")
      expect(q.allowDefer).toBe(false)
      expect(q.required).toBe(true)
    }
  })

  it("TIER1_BY_TYPE.fall references FALL_TIER1_QUESTIONS", () => {
    expect(TIER1_BY_TYPE.fall).toBe(FALL_TIER1_QUESTIONS)
  })

  it("TIER1_BY_TYPE only ships fall for the pilot", () => {
    expect(Object.keys(TIER1_BY_TYPE)).toEqual(["fall"])
  })

  it("Tier1Question type is structurally satisfied (compile-time guard)", () => {
    const sample: Tier1Question = FALL_TIER1_QUESTIONS[0]
    expect(sample.id).toBe("t1-q1")
  })
})
