import { describe, expect, it } from "vitest"
import { FALL_TIER1_QUESTIONS } from "@/lib/config/tier1-questions"
import type { ReportSession } from "@/lib/config/report-session"
import {
  applyStableTier2Answer,
  isSubstantiveTier2AnswerText,
} from "@/lib/report/tier2-stable-board"

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
    residentName: "Helen",
    residentRoom: "204",
    location: "room",
    hasInjury: null,
    reportPhase: "tier2",
    tier1Questions: FALL_TIER1_QUESTIONS,
    tier1Answers: {},
    tier1CompletedAt: now,
    fullNarrative: "base",
    agentState: { global_standards: {} as never, sub_type: null, sub_type_data: null },
    tier2Questions: Array.from({ length: 10 }, (_, i) => ({
      id: `t2-q${i + 1}`,
      text: `Question ${i + 1}`,
      askedAt: now,
    })),
    tier2Answers: {},
    tier2DeferredIds: [],
    tier2UnknownIds: [],
    closingQuestions: [],
    closingAnswers: {},
    activeDataCollectionMs: 0,
    dataPointsPerQuestion: [],
    completenessScore: 50,
    completenessAtTier1: 50,
    tier2QuestionsGenerated: 10,
    startedAt: now,
    lastActivityAt: now,
    ...overrides,
  }
}

describe("tier2-stable-board", () => {
  it("isSubstantiveTier2AnswerText rejects deferred/unknown placeholders", () => {
    expect(isSubstantiveTier2AnswerText("__DEFERRED__")).toBe(false)
    expect(isSubstantiveTier2AnswerText("__UNKNOWN__")).toBe(false)
    expect(isSubstantiveTier2AnswerText("vitals were taken")).toBe(true)
  })

  it("applyStableTier2Answer removes only the answered card", () => {
    const session = minimalSession()
    const result = applyStableTier2Answer({ session, answeredQuestionId: "t2-q3" })
    expect(result.nextBoard).toHaveLength(9)
    expect(result.nextBoard.some((q) => q.id === "t2-q3")).toBe(false)
    expect(result.removedQuestionId).toBe("t2-q3")
    expect(result.readyForClosing).toBe(false)
  })

  it("applyStableTier2Answer transitions when last card is answered", () => {
    const session = minimalSession({
      tier2Questions: [{ id: "t2-q10", text: "Last one", askedAt: new Date().toISOString() }],
    })
    const result = applyStableTier2Answer({ session, answeredQuestionId: "t2-q10" })
    expect(result.nextBoard).toHaveLength(0)
    expect(result.readyForClosing).toBe(true)
  })

  it("deferred cards remain on board until answered", () => {
    const session = minimalSession({
      tier2Questions: [
        { id: "t2-q1", text: "Deferred Q", askedAt: new Date().toISOString() },
        { id: "t2-q2", text: "Open Q", askedAt: new Date().toISOString() },
      ],
      tier2DeferredIds: ["t2-q1"],
    })
    const result = applyStableTier2Answer({ session, answeredQuestionId: "t2-q2" })
    expect(result.nextBoard.map((q) => q.id)).toEqual(["t2-q1"])
    expect(result.readyForClosing).toBe(false)
  })
})
