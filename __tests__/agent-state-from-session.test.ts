import { describe, expect, it, vi } from "vitest"
import { CLOSING_QUESTIONS } from "@/lib/config/tier1-questions"
import type { ReportSession } from "@/lib/config/report-session"

vi.mock("@/lib/agents/expert_investigator/analyze", () => ({
  sanitizeGlobalStandards: (input: Record<string, unknown>) => input,
  computeCompleteness: () => ({
    completenessScore: 0.72,
    filled: ["staff_narrative"],
    missing: ["immediate_injuries_observed"],
  }),
}))

vi.mock("@/lib/agents/expert_investigator/extraction-normalizer", () => ({
  normalizeExtractionFromNarrative: (_narrative: string, state: unknown) => state,
}))

import {
  rebuildAgentStateFromSession,
  seedAgentStateFromReport,
} from "@/lib/report/agent-state-from-session"

function baseSession(overrides: Partial<ReportSession> = {}): ReportSession {
  return {
    sessionId: "sess-1",
    incidentId: "inc-1",
    facilityId: "fac-1",
    userId: "user-1",
    userName: "Nurse",
    userRole: "staff",
    incidentType: "fall",
    residentId: "res-1",
    residentName: "Helen Thompson",
    residentRoom: "204",
    location: "hallway",
    hasInjury: true,
    reportPhase: "tier2",
    tier1Questions: [],
    tier1Answers: {},
    tier1CompletedAt: new Date().toISOString(),
    fullNarrative:
      "Resident found on floor at 1400. No visible injuries at time of discovery. Vitals stable.",
    agentState: null,
    tier2Questions: [{ id: "t2-q10", text: "Injuries?", askedAt: new Date().toISOString() }],
    tier2Answers: {},
    tier2DeferredIds: ["t2-q10"],
    tier2UnknownIds: [],
    closingQuestions: CLOSING_QUESTIONS,
    closingAnswers: {},
    activeDataCollectionMs: 0,
    dataPointsPerQuestion: [],
    completenessScore: 72,
    completenessAtTier1: 70,
    tier2QuestionsGenerated: 10,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    ...overrides,
  }
}

describe("agent-state-from-session", () => {
  it("seedAgentStateFromReport includes resident context", () => {
    const state = seedAgentStateFromReport(baseSession())
    expect(state.global_standards.resident_name).toBe("Helen Thompson")
    expect(state.global_standards.room_number).toBe("204")
  })

  it("rebuildAgentStateFromSession restores state from narrative when agentState is null", () => {
    const rebuilt = rebuildAgentStateFromSession(baseSession())
    expect(rebuilt).not.toBeNull()
    expect(rebuilt?.global_standards.staff_narrative).toContain("found on floor")
    expect(rebuilt?.completenessScore).toBe(0.72)
  })

  it("rebuildAgentStateFromSession returns null without narrative", () => {
    expect(rebuildAgentStateFromSession(baseSession({ fullNarrative: "" }))).toBeNull()
  })
})
