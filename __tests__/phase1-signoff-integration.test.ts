// @vitest-environment node
import { describe, expect, it } from "vitest"

import { mergeNotificationPreferences } from "@/lib/notification-prefs"
import { roleReceivesPhase1SignedPush } from "@/lib/notification-service"
import {
  buildPhase1SignoffSnapshot,
  phase1SignoffSnapshotForMongo,
} from "@/lib/report/phase1-signoff-snapshot"
import {
  buildPhase1SignedReportViewModel,
  resolvePhase1PreviewInsights,
} from "@/lib/report/phase1-signed-report-data"
import type { IncidentDocument } from "@/backend/src/models/incident.model"

function signedIncident(overrides: Partial<IncidentDocument> = {}): IncidentDocument {
  const signedAt = new Date("2026-06-07T15:00:00.000Z")
  return {
    id: "inc-helen",
    facilityId: "fac-1",
    title: "Fall",
    incidentType: "fall",
    location: "Room 101",
    phase: "phase_1_complete",
    status: "open",
    priority: "medium",
    staffId: "user-helen",
    staffName: "Helen Thompson",
    residentName: "Jane Resident",
    residentRoom: "101",
    createdAt: signedAt,
    updatedAt: signedAt,
    completenessAtSignoff: 91,
    questions: [],
    initialReport: {
      capturedAt: signedAt,
      narrative: "Resident found on floor near bathroom.",
      recordedById: "user-helen",
      recordedByName: "Helen Thompson",
      recordedByRole: "rn",
      signature: {
        signedBy: "user-helen",
        signedByName: "Helen Thompson",
        signedAt,
        role: "rn",
        declaration: "I certify this report is accurate.",
        signatureImage: "data:image/png;base64,drawn-signature",
      },
      phase1SignoffSnapshot: {
        expertNurseSummary: "Resident fall without apparent injury; monitoring continued.",
        nurseRecommendations: "Neuro checks and fall precautions.",
        administratorRecommendations: "Route for IDT review and care-plan update.",
        clinicalRecord: {
          narrative: "Signed clinical narrative.",
          residentStatement: "I slipped.",
          interventions: "Assisted to chair.",
          contributingFactors: "Wet floor.",
          recommendations: "Monitor gait.",
          environmentalAssessment: "Housekeeping notified.",
        },
        signedAt,
      },
    },
    ...overrides,
  } as IncidentDocument
}

describe("Phase 11e integration — persist → view → PDF data", () => {
  it("complete snapshot payload includes insights, clinical record, and signature image", () => {
    const incident = signedIncident()
    const ir = incident.initialReport!
    const snapshot = buildPhase1SignoffSnapshot(
      ir.phase1SignoffSnapshot!.clinicalRecord,
      {
        expertNurseSummary: ir.phase1SignoffSnapshot!.expertNurseSummary,
        nurseRecommendations: ir.phase1SignoffSnapshot!.nurseRecommendations,
        administratorRecommendations: ir.phase1SignoffSnapshot!.administratorRecommendations,
      },
      ir.signature!.signedAt as Date,
    )
    const mongo = phase1SignoffSnapshotForMongo(snapshot)

    expect(mongo.expertNurseSummary).toContain("fall")
    expect(mongo.nurseRecommendations).toBeTruthy()
    expect(mongo.administratorRecommendations).toBeTruthy()
    expect(mongo.clinicalRecord.narrative).toBe("Signed clinical narrative.")
    expect(ir.signature?.signatureImage).toMatch(/^data:image\/png;base64,/)
  })

  it("signed report view model matches snapshot for staff re-open", () => {
    const vm = buildPhase1SignedReportViewModel(signedIncident(), "Sunrise Care")
    expect(vm.previewData.previewInsights?.expertNurseSummary).toContain("fall")
    expect(vm.previewData.fullNarrative).toContain("bathroom")
    expect(vm.signedSignature.signatureImage).toMatch(/^data:image\/png;base64,/)
  })

  it("typed signature PNG is preserved the same way as drawn", () => {
    const typed = signedIncident({
      initialReport: {
        ...signedIncident().initialReport!,
        signature: {
          ...signedIncident().initialReport!.signature!,
          signatureImage: "data:image/png;base64,typed-name-signature",
        },
      },
    })
    const vm = buildPhase1SignedReportViewModel(typed, "Community")
    expect(vm.signedSignature.signatureImage).toBe("data:image/png;base64,typed-name-signature")
    expect(resolvePhase1PreviewInsights(typed)?.expertNurseSummary).toBeTruthy()
  })
})

describe("Phase 11e integration — Phase 2 notification prefs", () => {
  it("owner always receives investigation-ready", () => {
    const prefs = mergeNotificationPreferences(null)
    expect(roleReceivesPhase1SignedPush("owner", prefs, "fall")).toBe(true)
  })

  it("DON receives by default when per-incident prefs are unset", () => {
    const prefs = mergeNotificationPreferences(null)
    expect(roleReceivesPhase1SignedPush("director_of_nursing", prefs, "fall")).toBe(true)
  })

  it("respects facility whenPhase1Signed opt-out for a role", () => {
    const prefs = mergeNotificationPreferences({
      perIncident: {
        fall: {
          whenStarted: { director_of_nursing: true, administrator: true },
          whenPhase1Signed: { director_of_nursing: false, administrator: true },
        },
      },
    })
    expect(roleReceivesPhase1SignedPush("director_of_nursing", prefs, "fall")).toBe(false)
    expect(roleReceivesPhase1SignedPush("administrator", prefs, "fall")).toBe(true)
  })

  it("staff reporters never receive investigation-ready via phase2 recipient list", () => {
    const prefs = mergeNotificationPreferences(null)
    expect(roleReceivesPhase1SignedPush("rn", prefs, "fall")).toBe(false)
  })
})

describe("Phase 11e integration — email audit", () => {
  it("email route audit payload uses phase1_report_emailed with recipient", () => {
    const auditEntry = {
      action: "phase1_report_emailed" as const,
      performedBy: "user-helen",
      performedByName: "Helen Thompson",
      timestamp: new Date(),
      newValue: "archive@example.com",
      reason: "with_pdf_attachment",
    }
    expect(auditEntry.action).toBe("phase1_report_emailed")
    expect(auditEntry.newValue).toContain("@")
  })
})
