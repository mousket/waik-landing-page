// @vitest-environment node
import path from "path"
import dotenv from "dotenv"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { describe, expect, it } from "vitest"

import type { IncidentDocument } from "@/backend/src/models/incident.model"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { Phase1PdfTemplate } from "@/components/staff/phase1-pdf-template"
import { leanOne } from "@/lib/mongoose-lean"
import { renderPhase1PdfBuffer } from "@/lib/report/generate-phase1-pdf"
import { getWaikLogoDataUrlForPdf } from "@/lib/waik-logo-asset"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

function signedIncident(): IncidentDocument {
  return {
    id: "inc-test",
    facilityId: "fac-1",
    title: "Fall",
    incidentType: "fall",
    location: "Room 101",
    incidentDate: new Date("2026-06-01T14:00:00.000Z"),
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
        signatureImage: TINY_PNG,
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
  } as IncidentDocument
}

describe("Phase1PdfTemplate", () => {
  it("renders a PDF buffer for a signed incident with insights", async () => {
    const pdfBuffer = await renderToBuffer(
      React.createElement(Phase1PdfTemplate, {
        incident: signedIncident(),
        facilityName: "Sunrise Care",
        waikLogoSrc: TINY_PNG,
      }),
    )
    expect(pdfBuffer.length).toBeGreaterThan(500)
    expect(Buffer.from(pdfBuffer).subarray(0, 4).toString()).toBe("%PDF")
  })

  it("renders a PDF buffer for a real signed incident from MongoDB", async () => {
    if (!process.env.MONGODB_URI?.trim()) return

    await connectMongo()
    const incident = leanOne<IncidentDocument>(
      await IncidentModel.findOne({ id: "inc-83a9c2432f1e" }).lean().exec(),
    )
    if (!incident) return

    const pdfBuffer = await renderToBuffer(
      React.createElement(Phase1PdfTemplate, {
        incident,
        facilityName: "Debug Facility",
        waikLogoSrc: getWaikLogoDataUrlForPdf(),
      }),
    )
    expect(pdfBuffer.length).toBeGreaterThan(500)
    expect(Buffer.from(pdfBuffer).subarray(0, 4).toString()).toBe("%PDF")
  })

  it("renders via subprocess when NEXT_RUNTIME is set (Next.js API path)", async () => {
    if (!process.env.MONGODB_URI?.trim()) return

    const prevRuntime = process.env.NEXT_RUNTIME
    process.env.NEXT_RUNTIME = "nodejs"
    try {
      await connectMongo()
      const incident = leanOne<IncidentDocument>(
        await IncidentModel.findOne({ id: "inc-83a9c2432f1e" }).lean().exec(),
      )
      expect(incident).toBeTruthy()

      const pdfBuffer = await renderPhase1PdfBuffer(incident!, "Debug Facility")
      expect(pdfBuffer.length).toBeGreaterThan(500)
      expect(pdfBuffer.subarray(0, 4).toString()).toBe("%PDF")
    } finally {
      if (prevRuntime === undefined) delete process.env.NEXT_RUNTIME
      else process.env.NEXT_RUNTIME = prevRuntime
    }
  }, 30_000)
})
