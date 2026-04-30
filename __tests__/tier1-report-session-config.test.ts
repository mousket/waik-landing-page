import { describe, expect, it } from "vitest"
import {
  CLOSING_QUESTIONS,
  FALL_TIER1_QUESTIONS,
  TIER1_BY_TYPE,
} from "@/lib/config/tier1-questions"
import { REPORT_SESSION_PREFIX, REPORT_SESSION_TTL_SEC } from "@/lib/config/report-session"

describe("task IR-1a tier 1 config", () => {
  it("exports five fall Tier 1 questions with fixed ids", () => {
    expect(FALL_TIER1_QUESTIONS).toHaveLength(8)
    expect(FALL_TIER1_QUESTIONS.map((q) => q.id)).toEqual([
      "t1-q1",
      "t1-q2",
      "t1-q3",
      "t1-q4",
      "t1-q5",
      "t1-q6",
      "t1-q7",
      "t1-q8",
    ])
    for (const q of FALL_TIER1_QUESTIONS) {
      expect(q.tier).toBe("tier1")
      expect(q.allowDefer).toBe(false)
      expect(q.required).toBe(true)
      expect(q.text.length).toBeGreaterThan(0)
      expect(q.label.length).toBeGreaterThan(0)
      expect(q.areaHint.length).toBeGreaterThan(0)
    }
  })

  it("exports three closing questions", () => {
    expect(CLOSING_QUESTIONS).toHaveLength(3)
    expect(CLOSING_QUESTIONS.map((q) => q.id)).toEqual(["c-q1", "c-q2", "c-q3"])
    for (const q of CLOSING_QUESTIONS) {
      expect(q.tier).toBe("closing")
      expect(q.required).toBe(true)
    }
  })

  it("maps fall incident type to Tier 1 pack", () => {
    expect(TIER1_BY_TYPE.fall).toBe(FALL_TIER1_QUESTIONS)
  })
})

describe("report session Redis constants", () => {
  it("uses blueprint key prefix and TTL", () => {
    expect(REPORT_SESSION_PREFIX).toBe("waik:report:")
    expect(REPORT_SESSION_TTL_SEC).toBe(7200)
  })
})
