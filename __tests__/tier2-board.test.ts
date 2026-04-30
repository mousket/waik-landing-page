import { describe, expect, it } from "vitest"
import { FALL_TIER1_QUESTIONS } from "@/lib/config/tier1-questions"
import type { ReportSession } from "@/lib/config/report-session"
import {
  allocateNewTier2Ids,
  buildNextTier2Board,
  completenessToPercent,
  goldFieldDisplayKeys,
  normalizeQuestionText,
  supplementTier2Questions,
} from "@/lib/report/tier2-board"

function minimalSession(overrides: Partial<ReportSession> = {}): ReportSession {
  const now = new Date().toISOString()
  return {
    sessionId: "s",
    incidentId: "i",
    facilityId: "f",
    userId: "u",
    userName: "N",
    userRole: "rn",
    incidentType: "fall",
    residentId: "r",
    residentName: "A",
    residentRoom: "1",
    location: "room",
    hasInjury: null,
    reportPhase: "tier2",
    tier1Questions: FALL_TIER1_QUESTIONS,
    tier1Answers: {},
    tier1CompletedAt: null,
    fullNarrative: "base",
    agentState: { global_standards: {} as never, sub_type: null, sub_type_data: null },
    tier2Questions: [
      { id: "t2-q1", text: "Ask about footwear?", askedAt: now },
      { id: "t2-q2", text: "Ask about lighting?", askedAt: now },
    ],
    tier2Answers: {},
    tier2DeferredIds: [],
    tier2UnknownIds: [],
    closingQuestions: [],
    closingAnswers: {},
    activeDataCollectionMs: 0,
    dataPointsPerQuestion: [],
    completenessScore: 40,
    completenessAtTier1: 40,
    tier2QuestionsGenerated: 2,
    startedAt: now,
    lastActivityAt: now,
    ...overrides,
  }
}

describe("normalizeQuestionText", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeQuestionText("  Foo   Bar\n")).toBe("foo bar")
  })
})

describe("goldFieldDisplayKeys", () => {
  it("strips global/subtype prefixes", () => {
    expect(goldFieldDisplayKeys(["global.assistive_device_in_use", "subtype.floor_mat_present"])).toEqual([
      "assistive_device_in_use",
      "floor_mat_present",
    ])
  })
})

describe("completenessToPercent", () => {
  it("maps 1–10 scores to percent", () => {
    expect(completenessToPercent(7.5)).toBe(75)
    expect(completenessToPercent(10)).toBe(100)
  })
})

describe("allocateNewTier2Ids", () => {
  it("increments from max t2-q suffix", () => {
    expect(
      allocateNewTier2Ids(
        [
          { id: "t2-q3", text: "a" },
          { id: "t2-q10", text: "b" },
        ],
        2,
      ),
    ).toEqual(["t2-q11", "t2-q12"])
  })
})

describe("supplementTier2Questions", () => {
  it("pads with generic prompts when below minCount", () => {
    const missing = Array.from({ length: 9 }, (_, i) => ({
      key: `global.f${i}`,
      label: `Topic ${i}`,
      context: "ctx",
      category: "narrative" as const,
    }))
    const out = supplementTier2Questions([], missing, 4, 8)
    expect(out.length).toBeGreaterThanOrEqual(4)
  })
})

describe("buildNextTier2Board", () => {
  it("matches supplemented text to existing unanswered cards by normalized text", () => {
    const now = new Date().toISOString()
    const session = minimalSession({
      tier2Questions: [
        { id: "t2-q1", text: "Ask about footwear?", askedAt: now },
        { id: "t2-q2", text: "Ask about lighting?", askedAt: now },
      ],
    })
    const { nextBoard, newQuestions } = buildNextTier2Board({
      session,
      answeredQuestionId: "t2-q1",
      transcript: "answer one",
      supplementedTexts: ["Ask about lighting?", "Brand new question"],
    })
    const lighting = nextBoard.find((q) => q.text.includes("lighting"))
    expect(lighting?.id).toBe("t2-q2")
    expect(newQuestions).toHaveLength(1)
    expect(newQuestions[0]?.text).toContain("Brand new")
  })

  it("when supplemented empty, keeps other unanswered questions", () => {
    const now = new Date().toISOString()
    const session = minimalSession({
      tier2Questions: [
        { id: "t2-q1", text: "Q1", askedAt: now },
        { id: "t2-q2", text: "Q2", askedAt: now },
      ],
    })
    const { nextBoard } = buildNextTier2Board({
      session,
      answeredQuestionId: "t2-q1",
      transcript: "a",
      supplementedTexts: [],
    })
    expect(nextBoard.map((q) => q.id)).toEqual(["t2-q2"])
  })
})
