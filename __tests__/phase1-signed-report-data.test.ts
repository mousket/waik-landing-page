// @vitest-environment node
import { describe, expect, it } from "vitest"

import type { IncidentDocument } from "@/backend/src/models/incident.model"
import {
  buildPhase1SignedReportViewModel,
  clinicalRecordToSections,
  hasStructuredClinicalSections,
  resolvePhase1ClinicalRecord,
  resolvePhase1PreviewInsights,
} from "@/lib/report/phase1-signed-report-data"

function baseIncident(overrides: Partial<IncidentDocument> = {}): IncidentDocument {
  return {
    id: "inc-1",
    facilityId: "fac-1",
    title: "Fall",
    incidentType: "fall",
    location: "Room 101",
    incidentDate: new Date("2026-06-01T14:00:00.000Z"),
    incidentTime: "14:00",
    phase: "phase_1_complete",
    status: "open",
    priority: "medium",
    staffId: "user-1",
    staffName: "Helen Nurse",
    residentName: "Jane Resident",
    residentRoom: "101",
    createdAt: new Date("2026-06-01T14:00:00.000Z"),
    updatedAt: new Date("2026-06-01T15:00:00.000Z"),
    completenessScore: 92,
    completenessAtSignoff: 92,
    questions: [],
    initialReport: {
      capturedAt: new Date("2026-06-01T15:00:00.000Z"),
      narrative: "Resident slipped near the bathroom.",
      recordedById: "user-1",
      recordedByName: "Helen Nurse",
      recordedByRole: "rn",
      signature: {
        signedBy: "user-1",
        signedByName: "Helen Nurse",
        signedAt: new Date("2026-06-01T15:05:00.000Z"),
        role: "rn",
        declaration: "I certify this report is accurate.",
        signatureImage: "data:image/png;base64,abc123",
      },
      phase1SignoffSnapshot: {
        expertNurseSummary: "Resident experienced a fall with no apparent injury.",
        nurseRecommendations: "Monitor gait and hydration.",
        administratorRecommendations: "Route for IDT review.",
        clinicalRecord: {
          narrative: "Signed narrative text.",
          residentStatement: "I slipped.",
          interventions: "Assisted to chair.",
          contributingFactors: "Wet floor.",
          recommendations: "Monitor closely.",
          environmentalAssessment: "Housekeeping notified.",
        },
        signedAt: new Date("2026-06-01T15:05:00.000Z"),
      },
    },
    ...overrides,
  } as IncidentDocument
}

describe("buildPhase1SignedReportViewModel", () => {
  it("maps snapshot insights and clinical record for signed view", () => {
    const vm = buildPhase1SignedReportViewModel(baseIncident(), "Sunrise Care")

    expect(vm.previewData.facilityName).toBe("Sunrise Care")
    expect(vm.previewData.previewInsights?.expertNurseSummary).toContain("fall")
    expect(vm.previewData.clinicalRecord.narrative).toBe("Signed narrative text.")
    expect(vm.previewData.fullNarrative).toBe("Resident slipped near the bathroom.")
    expect(vm.signedSignature.signatureImage).toMatch(/^data:image\/png;base64,/)
    expect(vm.signedSignature.signedByName).toBe("Helen Nurse")
  })

  it("falls back to enhanced narrative when snapshot is missing", () => {
    const incident = baseIncident({
      initialReport: {
        ...baseIncident().initialReport!,
        phase1SignoffSnapshot: undefined,
        enhancedNarrative:
          "DESCRIPTION OF INCIDENT:\nLegacy narrative.\n\nRESIDENT STATEMENT:\nNone.\n\nIMMEDIATE INTERVENTIONS:\nHelped up.\n\nCONTRIBUTING FACTORS:\nClutter.\n\nRECOMMENDATIONS:\nMonitor.\n\nENVIRONMENTAL ASSESSMENT:\nClear path.",
      },
    })

    const vm = buildPhase1SignedReportViewModel(incident, "Community")
    expect(vm.previewData.clinicalRecord.narrative).toBe("Legacy narrative.")
    expect(vm.previewData.previewInsights).toBeUndefined()
  })
})

describe("phase1 PDF snapshot helpers", () => {
  it("exposes insights and structured sections when snapshot exists", () => {
    const incident = baseIncident()
    const insights = resolvePhase1PreviewInsights(incident)
    const record = resolvePhase1ClinicalRecord(incident)
    const sections = clinicalRecordToSections(record)

    expect(insights?.expertNurseSummary).toContain("fall")
    expect(hasStructuredClinicalSections(record)).toBe(true)
    expect(sections.find((s) => s.title === "Description of Incident")?.body).toBe("Signed narrative text.")
  })

  it("supports legacy incidents without snapshot", () => {
    const incident = baseIncident({
      initialReport: {
        ...baseIncident().initialReport!,
        phase1SignoffSnapshot: undefined,
        enhancedNarrative: "DESCRIPTION OF INCIDENT:\nLegacy only.\n\nRESIDENT STATEMENT:\n—",
      },
    })

    expect(resolvePhase1PreviewInsights(incident)).toBeUndefined()
    expect(resolvePhase1ClinicalRecord(incident).narrative).toBe("Legacy only.")
  })
})
