import { describe, expect, it } from "vitest"
import { FALL_TIER1_QUESTIONS, CLOSING_QUESTIONS } from "@/lib/config/tier1-questions"
import type { ReportSession } from "@/lib/config/report-session"
import {
  reconcileReportPhase,
  reconcileReportSession,
} from "@/lib/report/reconcile-report-session"
import type { IncidentDocument } from "@/backend/src/models/incident.model"

function minimalSession(overrides: Partial<ReportSession> = {}): ReportSession {
  const now = new Date().toISOString()
  return {
    sessionId: "sess-1",
    incidentId: "inc-helen",
    facilityId: "fac-1",
    userId: "user-1",
    userName: "Nurse",
    userRole: "rn",
    incidentType: "fall",
    residentId: "res-1",
    residentName: "Helen Thompson",
    residentRoom: "204",
    location: "room",
    hasInjury: null,
    reportPhase: "closing",
    tier1Questions: FALL_TIER1_QUESTIONS,
    tier1Answers: Object.fromEntries(FALL_TIER1_QUESTIONS.map((q) => [q.id, "answered"])),
    tier1CompletedAt: now,
    fullNarrative: "narrative",
    agentState: { global_standards: {} as never, sub_type: null, sub_type_data: null },
    tier2Questions: [],
    tier2Answers: { "t2-q1": "answered one" },
    tier2DeferredIds: [],
    tier2UnknownIds: [],
    closingQuestions: CLOSING_QUESTIONS,
    closingAnswers: {},
    activeDataCollectionMs: 0,
    dataPointsPerQuestion: [
      {
        questionId: "t2-q1",
        questionText: "Head impact?",
        dataPointsCovered: 1,
        fieldsCovered: [],
      },
    ],
    completenessScore: 90,
    completenessAtTier1: 50,
    tier2QuestionsGenerated: 3,
    startedAt: now,
    lastActivityAt: now,
    ...overrides,
  }
}

describe("reconcileReportPhase", () => {
  it("returns tier2 when live follow-ups remain even if reportPhase was closing", () => {
    const session = minimalSession({
      reportPhase: "closing",
      tier2Questions: [
        { id: "t2-q2", text: "Vitals?", askedAt: new Date().toISOString() },
        { id: "t2-q3", text: "Deferred?", askedAt: new Date().toISOString() },
      ],
    })
    expect(reconcileReportPhase(session)).toBe("tier2")
  })

  it("returns closing only when tier2 board is clear and closing is incomplete", () => {
    const session = minimalSession({ reportPhase: "tier2", tier2Questions: [] })
    expect(reconcileReportPhase(session)).toBe("closing")
  })
})

describe("reconcileReportSession", () => {
  it("merges pending tier2 from incident and downgrades stale closing phase", () => {
    const session = minimalSession({ reportPhase: "closing", tier2Questions: [] })
    const incident = {
      id: "inc-helen",
      questions: [
        {
          id: "t2-q2",
          questionText: "Were vitals taken?",
          askedBy: "user-1",
          askedAt: new Date(),
          generatedBy: "tier-2-gap",
          priority: { phase: "follow-up", order: 2, isCritical: false },
        },
        {
          id: "t2-q3",
          questionText: "Family notified?",
          askedBy: "user-1",
          askedAt: new Date(),
          generatedBy: "tier-2-gap",
          answer: { answerText: "__DEFERRED__", answeredBy: "user-1", answeredAt: new Date() },
          priority: { phase: "follow-up", order: 3, isCritical: false },
        },
      ],
    } as unknown as IncidentDocument

    const { session: next, changed } = reconcileReportSession(session, incident)
    expect(changed).toBe(true)
    expect(next.reportPhase).toBe("tier2")
    expect(next.tier2Questions.map((q) => q.id).sort()).toEqual(["t2-q2", "t2-q3"])
    expect(next.tier2DeferredIds).toContain("t2-q3")
  })
})
