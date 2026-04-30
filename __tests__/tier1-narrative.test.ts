import { describe, expect, it } from "vitest"
import { FALL_TIER1_QUESTIONS } from "@/lib/config/tier1-questions"
import type { ReportSession } from "@/lib/config/report-session"
import {
  buildTier1Narrative,
  tier1AnsweredIds,
  tier1ProgressScore,
} from "@/lib/report/tier1-narrative"

function baseSession(overrides: Partial<ReportSession> = {}): ReportSession {
  const now = new Date().toISOString()
  return {
    sessionId: "s1",
    incidentId: "i1",
    facilityId: "f1",
    userId: "u1",
    userName: "Nurse",
    userRole: "rn",
    incidentType: "fall",
    residentId: "r1",
    residentName: "A",
    residentRoom: "1",
    location: "room",
    hasInjury: null,
    reportPhase: "tier1",
    tier1Questions: FALL_TIER1_QUESTIONS,
    tier1Answers: {},
    tier1CompletedAt: null,
    fullNarrative: "",
    agentState: null,
    tier2Questions: [],
    tier2Answers: {},
    tier2DeferredIds: [],
    tier2UnknownIds: [],
    closingQuestions: [],
    closingAnswers: {},
    activeDataCollectionMs: 0,
    dataPointsPerQuestion: [],
    completenessScore: 0,
    completenessAtTier1: 0,
    tier2QuestionsGenerated: 0,
    startedAt: now,
    lastActivityAt: now,
    ...overrides,
  }
}

describe("buildTier1Narrative", () => {
  it("joins answers in question order and drops empties", () => {
    const s = baseSession({
      tier1Answers: {
        "t1-q2": "  B  ",
        "t1-q1": "A",
        "t1-q3": "",
        "t1-q4": "D",
      },
    })
    expect(buildTier1Narrative(s)).toBe("A\n\nB\n\nD")
  })

  it("replaces text when a question is re-recorded (no duplicate blocks)", () => {
    const s = baseSession({
      tier1Answers: {
        "t1-q1": "first",
      },
    })
    expect(buildTier1Narrative(s)).toBe("first")
    s.tier1Answers["t1-q1"] = "second"
    expect(buildTier1Narrative(s)).toBe("second")
  })
})

describe("tier1ProgressScore", () => {
  it("is 100 when all Tier 1 slots have non-whitespace answers", () => {
    const ids = FALL_TIER1_QUESTIONS.map((q) => q.id)
    const tier1Answers = Object.fromEntries(ids.map((id) => [id, "x"]))
    expect(tier1ProgressScore(baseSession({ tier1Answers }))).toBe(100)
  })
})

describe("tier1AnsweredIds", () => {
  it("returns ids with non-empty trimmed answers in Tier 1 order", () => {
    const s = baseSession({
      tier1Answers: { "t1-q2": "y", "t1-q1": "x" },
    })
    expect(tier1AnsweredIds(s)).toEqual(["t1-q1", "t1-q2"])
  })
})
