import { describe, expect, it } from "vitest"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import {
  buildPendingQuestionPhaseLines,
  formatTier2PendingDetail,
  getPendingQuestionCount,
  getPendingQuestionHeadline,
  getPhaseDotColor,
  hasAssignedIdtQuestions,
  hasPendingQuestions,
} from "@/lib/utils/pending-question-utils"

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
    reporterName: "Jane Nurse",
    startedAt: new Date().toISOString(),
    phase1SignedAt: null,
    completenessScore: 88,
    completenessAtSignoff: 0,
    tier2QuestionsGenerated: 10,
    questionsAnswered: 8,
    questionsDeferred: 0,
    pendingQuestionCount: 13,
    pendingTier1Count: 0,
    pendingTier2Count: 10,
    pendingTier2UnansweredCount: 0,
    pendingTier2DeferredCount: 10,
    pendingClosingCount: 3,
    tier2Generated: true,
    isOwnReport: true,
    hasAssignedTask: false,
    ...overrides,
  }
}

describe("pending-question-utils", () => {
  it("hasPendingQuestions: in_progress + score<100 → true", () => {
    expect(hasPendingQuestions(baseIncident({ phase: "phase_1_in_progress", completenessScore: 88 }))).toBe(true)
  })

  it("getPendingQuestionCount: uses API pendingQuestionCount (all tiers)", () => {
    expect(getPendingQuestionCount(baseIncident({ pendingQuestionCount: 13 }))).toBe(13)
  })

  it("formatTier2PendingDetail: deferred-only", () => {
    expect(formatTier2PendingDetail(true, 0, 1)).toBe("1 deferred")
    expect(formatTier2PendingDetail(true, 2, 3)).toBe("2 left · 3 deferred")
  })

  it("buildPendingQuestionPhaseLines: Helen-style (all tier2 deferred)", () => {
    expect(buildPendingQuestionPhaseLines(baseIncident())).toEqual([
      { label: "Tier 1", detail: "complete" },
      { label: "Tier 2", detail: "10 deferred", tone: "deferred" },
      { label: "Closing", detail: "3 left" },
    ])
  })

  it("buildPendingQuestionPhaseLines: injuries deferred only", () => {
    expect(
      buildPendingQuestionPhaseLines(
        baseIncident({
          pendingQuestionCount: 4,
          pendingTier2Count: 1,
          pendingTier2UnansweredCount: 0,
          pendingTier2DeferredCount: 1,
          pendingClosingCount: 3,
        }),
      ),
    ).toEqual([
      { label: "Tier 1", detail: "complete" },
      { label: "Tier 2", detail: "1 deferred", tone: "deferred" },
      { label: "Closing", detail: "3 left" },
    ])
  })

  it("getPendingQuestionHeadline: phase 2 IDT assignment shows team questions", () => {
    expect(
      getPendingQuestionHeadline(
        baseIncident({
          phase: "phase_2_in_progress",
          completenessScore: 100,
          pendingQuestionCount: 1,
          hasAssignedTask: true,
          isOwnReport: false,
        }),
      ),
    ).toEqual({ text: "1 team question for you", tone: "urgent" })
    expect(
      hasAssignedIdtQuestions(
        baseIncident({
          phase: "phase_2_in_progress",
          pendingQuestionCount: 2,
          hasAssignedTask: true,
        }),
      ),
    ).toBe(true)
  })

  it("getPendingQuestionHeadline: deferred-only uses amber tone", () => {
    expect(
      getPendingQuestionHeadline(
        baseIncident({
          pendingQuestionCount: 1,
          pendingTier2Count: 1,
          pendingTier2UnansweredCount: 0,
          pendingTier2DeferredCount: 1,
          pendingClosingCount: 0,
        }),
      ),
    ).toEqual({ text: "1 deferred question", tone: "deferred" })
  })

  it("buildPendingQuestionPhaseLines: Dorothy-style (tier1 pending, tier2 not generated)", () => {
    expect(
      buildPendingQuestionPhaseLines(
        baseIncident({
          pendingQuestionCount: 11,
          pendingTier1Count: 8,
          pendingTier2Count: 0,
          pendingTier2UnansweredCount: 0,
          pendingTier2DeferredCount: 0,
          pendingClosingCount: 3,
          tier2Generated: false,
        }),
      ),
    ).toEqual([
      { label: "Tier 1", detail: "8 left" },
      { label: "Tier 2", detail: "not generated", tone: "default" },
      { label: "Closing", detail: "3 left" },
    ])
  })

  it("getPhaseDotColor: all phases map to expected colors", () => {
    expect(getPhaseDotColor("phase_1_in_progress")).toBe("#E8A838")
    expect(getPhaseDotColor("phase_1_complete")).toBe("#F4D03F")
    expect(getPhaseDotColor("phase_2_in_progress")).toBe("#2E86DE")
    expect(getPhaseDotColor("closed")).toBe("#0D7377")
  })
})
