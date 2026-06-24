// @vitest-environment node
import { describe, expect, it } from "vitest"

import { FALL_TIER1_QUESTIONS, CLOSING_QUESTIONS } from "@/lib/config/tier1-questions"
import type { ReportSession } from "@/lib/config/report-session"
import {
  buildIncidentDraftFromSession,
  buildQuestionsFromReportSession,
  questionGroupsFromSession,
} from "@/lib/report/sync-session-to-incident"

function baseSession(overrides: Partial<ReportSession> = {}): ReportSession {
  return {
    sessionId: "sess-1",
    incidentId: "inc-test",
    facilityId: "fac-1",
    userId: "user-1",
    userName: "Jane Nurse",
    userRole: "cna",
    incidentType: "fall",
    residentId: "res-1",
    residentName: "John Doe",
    residentRoom: "101",
    location: "Room 101",
    hasInjury: false,
    reportPhase: "tier1",
    tier1Questions: FALL_TIER1_QUESTIONS.slice(0, 5),
    tier1Answers: {},
    tier1CompletedAt: null,
    fullNarrative: "",
    agentState: null,
    tier2Questions: [],
    tier2Answers: {},
    tier2DeferredIds: [],
    tier2UnknownIds: [],
    closingQuestions: CLOSING_QUESTIONS,
    closingAnswers: {},
    activeDataCollectionMs: 0,
    dataPointsPerQuestion: [],
    completenessScore: 0,
    completenessAtTier1: 0,
    tier2QuestionsGenerated: 0,
    startedAt: "2026-05-21T10:00:00.000Z",
    lastActivityAt: "2026-05-21T10:00:00.000Z",
    ...overrides,
  }
}

describe("buildIncidentDraftFromSession", () => {
  it("includes active session and narrative draft", () => {
    const session = baseSession({
      sessionId: "sess-abc",
      fullNarrative: " Resident fell in room. ",
      completenessScore: 42,
    })
    const draft = buildIncidentDraftFromSession(session)
    expect(draft.activeReportSessionId).toBe("sess-abc")
    expect(draft.activeReportPhase).toBe("tier1")
    expect(draft.initialReport?.narrative).toBe("Resident fell in room.")
    expect(draft.completenessScore).toBe(42)
  })
})

describe("buildQuestionsFromReportSession", () => {
  it("maps Tier 1 with partial answers", () => {
    const session = baseSession({
      closingQuestions: [],
      tier1Answers: {
        "t1-q1": "Resident found on floor.",
        "t1-q2": "He said he slipped.",
        "t1-q3": "We helped him up.",
      },
    })
    const docs = buildQuestionsFromReportSession(session)
    expect(docs).toHaveLength(5)
    const answered = docs.filter((d) => d.answer?.answerText && d.answer.answerText !== "__DEFERRED__")
    expect(answered).toHaveLength(3)
    const unanswered = docs.filter((d) => !d.answer)
    expect(unanswered).toHaveLength(2)
    expect(questionGroupsFromSession(session).every((g) => g === "tier1")).toBe(true)
  })

  it("maps Tier 2 board with answered and deferred", () => {
    const session = baseSession({
      reportPhase: "tier2",
      tier1Answers: Object.fromEntries(FALL_TIER1_QUESTIONS.map((q) => [q.id, "answered"])),
      tier2Questions: [
        { id: "t2-q1", text: "Head impact?", askedAt: "2026-05-21T10:05:00.000Z" },
        { id: "t2-q2", text: "Vitals?", askedAt: "2026-05-21T10:05:00.000Z" },
        { id: "t2-q3", text: "Physician?", askedAt: "2026-05-21T10:05:00.000Z" },
        { id: "t2-q4", text: "Family?", askedAt: "2026-05-21T10:05:00.000Z" },
      ],
      tier2Answers: {
        "t2-q1": "No head impact.",
        "t2-q2": "Vitals stable.",
      },
      tier2DeferredIds: ["t2-q4"],
      tier2QuestionsGenerated: 4,
    })
    const docs = buildQuestionsFromReportSession(session)
    const tier2 = docs.filter((d) => d.generatedBy === "tier-2-gap")
    expect(tier2).toHaveLength(4)
    expect(tier2.find((d) => d.id === "t2-q1")?.answer?.answerText).toBe("No head impact.")
    expect(tier2.find((d) => d.id === "t2-q4")?.answer?.answerText).toBe("__DEFERRED__")
    expect(tier2.find((d) => d.id === "t2-q3")?.answer).toBeUndefined()
    const groups = questionGroupsFromSession(session).filter((_, i) => docs[i].generatedBy === "tier-2-gap")
    expect(groups.every((g) => g === "tier2")).toBe(true)
  })

  it("maps closing questions", () => {
    const session = baseSession({
      reportPhase: "closing",
      closingAnswers: Object.fromEntries(CLOSING_QUESTIONS.map((q) => [q.id, "Yes, documented."])),
    })
    const docs = buildQuestionsFromReportSession(session)
    const closing = docs.filter((d) => d.generatedBy === "closing-report")
    expect(closing).toHaveLength(CLOSING_QUESTIONS.length)
    expect(closing.every((d) => d.answer?.answerText)).toBe(true)
    const groups = questionGroupsFromSession(session).slice(-CLOSING_QUESTIONS.length)
    expect(groups.every((g) => g === "closing")).toBe(true)
  })
})
