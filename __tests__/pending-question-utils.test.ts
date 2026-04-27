import { describe, expect, it } from "vitest"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import { getPendingQuestionCount, getPhaseDotColor, hasPendingQuestions } from "@/lib/utils/pending-question-utils"

function baseIncident(overrides: Partial<StaffIncidentSummary> = {}): StaffIncidentSummary {
  return {
    id: "inc-1",
    facilityId: "fac-1",
    residentName: "Sample Resident",
    residentRoom: "204",
    incidentType: "Fall",
    hasInjury: false,
    phase: "phase_1_in_progress",
    staffId: "user-1",
    startedAt: new Date().toISOString(),
    phase1SignedAt: null,
    completenessScore: 88,
    completenessAtSignoff: 0,
    tier2QuestionsGenerated: 6,
    questionsAnswered: 5,
    questionsDeferred: 0,
    ...overrides,
  }
}

describe("pending-question-utils", () => {
  it("hasPendingQuestions: in_progress + score<100 → true", () => {
    expect(hasPendingQuestions(baseIncident({ phase: "phase_1_in_progress", completenessScore: 88 }))).toBe(true)
  })

  it("hasPendingQuestions: complete → false", () => {
    expect(hasPendingQuestions(baseIncident({ phase: "phase_1_complete", completenessScore: 82 }))).toBe(false)
  })

  it("hasPendingQuestions: in_progress + score=100 → false", () => {
    expect(hasPendingQuestions(baseIncident({ phase: "phase_1_in_progress", completenessScore: 100 }))).toBe(false)
  })

  it("getPendingQuestionCount: 6 generated - 5 answered → 1", () => {
    expect(getPendingQuestionCount(baseIncident({ tier2QuestionsGenerated: 6, questionsAnswered: 5 }))).toBe(1)
  })

  it("getPendingQuestionCount: 0 generated → 1 (minimum)", () => {
    expect(getPendingQuestionCount(baseIncident({ tier2QuestionsGenerated: 0, questionsAnswered: 0 }))).toBe(1)
  })

  it("getPhaseDotColor: all phases map to expected colors", () => {
    expect(getPhaseDotColor("phase_1_in_progress")).toBe("#E8A838")
    expect(getPhaseDotColor("phase_1_complete")).toBe("#F4D03F")
    expect(getPhaseDotColor("phase_2_in_progress")).toBe("#2E86DE")
    expect(getPhaseDotColor("closed")).toBe("#0D7377")
  })
})

