// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

import type { ClinicalRecord } from "@/lib/agents/clinical-record-generator"
import type { ClinicalPreviewInsights } from "@/lib/agents/clinical-preview-insights"
import { CLOSING_QUESTIONS, FALL_TIER1_QUESTIONS } from "@/lib/config/tier1-questions"
import type { ReportSession } from "@/lib/config/report-session"
import {
  applyEditedSections,
  buildPhase1SignoffSnapshot,
  phase1SignoffSnapshotForMongo,
  resolvePreviewInsightsForSignoff,
} from "@/lib/report/phase1-signoff-snapshot"

vi.mock("@/lib/agents/clinical-preview-insights", () => ({
  generateClinicalPreviewInsights: vi.fn(async () => ({
    expertNurseSummary: "Regenerated summary.",
    nurseRecommendations: "Regenerated nurse recs.",
    administratorRecommendations: "Regenerated admin recs.",
  })),
}))

function sampleClinicalRecord(overrides: Partial<ClinicalRecord> = {}): ClinicalRecord {
  return {
    narrative: "Resident slipped in hallway.",
    residentStatement: "I lost my balance.",
    interventions: "Assisted to chair and notified nurse.",
    contributingFactors: "Wet floor near kitchen.",
    recommendations: "Monitor gait and hydration.",
    environmentalAssessment: "Floor was damp; housekeeping notified.",
    ...overrides,
  }
}

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
    reportPhase: "signoff",
    tier1Questions: FALL_TIER1_QUESTIONS.slice(0, 3),
    tier1Answers: {},
    tier1CompletedAt: null,
    fullNarrative: "Resident found on floor.",
    agentState: null,
    tier2Questions: [],
    tier2Answers: {},
    tier2DeferredIds: [],
    tier2UnknownIds: [],
    closingQuestions: CLOSING_QUESTIONS,
    closingAnswers: Object.fromEntries(CLOSING_QUESTIONS.map((q) => [q.id, "Answered."])),
    activeDataCollectionMs: 0,
    dataPointsPerQuestion: [],
    completenessScore: 88,
    completenessAtTier1: 70,
    tier2QuestionsGenerated: 0,
    startedAt: "2026-05-21T10:00:00.000Z",
    lastActivityAt: "2026-05-21T10:00:00.000Z",
    ...overrides,
  }
}

const cachedInsights: ClinicalPreviewInsights = {
  expertNurseSummary: "Senior nurse summary of the fall.",
  nurseRecommendations: "Continue neuro checks every shift.",
  administratorRecommendations: "Route for IDT review and care-plan update.",
}

describe("applyEditedSections", () => {
  it("merges nurse edits into the clinical record before snapshot", () => {
    const record = sampleClinicalRecord()
    applyEditedSections(record, {
      narrative: "  Edited narrative.  ",
      recommendations: "New monitoring plan.",
    })
    expect(record.narrative).toBe("Edited narrative.")
    expect(record.recommendations).toBe("New monitoring plan.")
    expect(record.interventions).toBe("Assisted to chair and notified nurse.")
  })
})

describe("buildPhase1SignoffSnapshot", () => {
  it("captures insights, final clinical record, and signedAt", () => {
    const signedAt = new Date("2026-06-07T14:30:00.000Z")
    const record = sampleClinicalRecord({ narrative: "Edited at sign-off." })
    const snapshot = buildPhase1SignoffSnapshot(record, cachedInsights, signedAt)

    expect(snapshot.expertNurseSummary).toBe(cachedInsights.expertNurseSummary)
    expect(snapshot.nurseRecommendations).toBe(cachedInsights.nurseRecommendations)
    expect(snapshot.administratorRecommendations).toBe(cachedInsights.administratorRecommendations)
    expect(snapshot.clinicalRecord.narrative).toBe("Edited at sign-off.")
    expect(snapshot.signedAt).toBe(signedAt.toISOString())
  })
})

describe("phase1SignoffSnapshotForMongo", () => {
  it("converts signedAt to a Date for Mongo $set", () => {
    const signedAt = new Date("2026-06-07T14:30:00.000Z")
    const snapshot = buildPhase1SignoffSnapshot(sampleClinicalRecord(), cachedInsights, signedAt)
    const mongo = phase1SignoffSnapshotForMongo(snapshot)

    expect(mongo.signedAt).toBeInstanceOf(Date)
    expect(mongo.signedAt.toISOString()).toBe(signedAt.toISOString())
    expect(mongo.clinicalRecord.narrative).toBe(snapshot.clinicalRecord.narrative)
  })
})

describe("resolvePreviewInsightsForSignoff", () => {
  it("uses cached session insights when preview was opened", async () => {
    const session = baseSession({ generatedPreviewInsights: cachedInsights })
    const insights = await resolvePreviewInsightsForSignoff(session, sampleClinicalRecord())
    expect(insights).toEqual(cachedInsights)
  })

  it("regenerates insights when preview was skipped", async () => {
    const session = baseSession({ generatedPreviewInsights: undefined })
    const insights = await resolvePreviewInsightsForSignoff(session, sampleClinicalRecord())
    expect(insights.expertNurseSummary).toBe("Regenerated summary.")
    expect(insights.nurseRecommendations).toBe("Regenerated nurse recs.")
    expect(insights.administratorRecommendations).toBe("Regenerated admin recs.")
  })
})

describe("complete route snapshot payload shape", () => {
  it("includes all snapshot fields for Mongo when session has insights", () => {
    const signedAt = new Date("2026-06-07T14:30:00.000Z")
    const record = sampleClinicalRecord()
    applyEditedSections(record, { narrative: "Nurse final narrative." })
    const snapshot = buildPhase1SignoffSnapshot(record, cachedInsights, signedAt)
    const setDoc = {
      "initialReport.phase1SignoffSnapshot": phase1SignoffSnapshotForMongo(snapshot),
      "initialReport.signature": {
        signatureImage: "data:image/png;base64,abc123",
      },
    }

    const persisted = setDoc["initialReport.phase1SignoffSnapshot"]
    expect(persisted.expertNurseSummary).toBeTruthy()
    expect(persisted.nurseRecommendations).toBeTruthy()
    expect(persisted.administratorRecommendations).toBeTruthy()
    expect(persisted.clinicalRecord.narrative).toBe("Nurse final narrative.")
    expect(setDoc["initialReport.signature"].signatureImage).toMatch(/^data:image\/png;base64,/)
  })
})
