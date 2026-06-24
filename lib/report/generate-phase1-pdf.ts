import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { Phase1PdfTemplate } from "@/components/staff/phase1-pdf-template"
import { leanOne } from "@/lib/mongoose-lean"
import { renderPhase1PdfBufferSubprocess } from "@/lib/report/phase1-pdf-subprocess"
import { getWaikLogoDataUrlForPdf } from "@/lib/waik-logo-asset"

function shouldUsePdfSubprocess(): boolean {
  if (process.env.PHASE1_PDF_SUBPROCESS === "false") return false
  if (process.env.PHASE1_PDF_SUBPROCESS === "true") return true
  // Next.js webpack bundles break @react-pdf's React reconciler (React error #31).
  return Boolean(process.env.NEXT_RUNTIME)
}

async function uploadToBlobStorage(buffer: Buffer, incidentId: string): Promise<string | null> {
  const baseUrl = process.env.BLOB_STORAGE_URL?.trim()
  if (!baseUrl) return null

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/phase1-reports/${incidentId}.pdf`
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: new Uint8Array(buffer),
    })
    if (!res.ok) {
      console.warn("[generate-phase1-pdf] Blob upload failed:", res.status, res.statusText)
      return null
    }
    return url
  } catch (err) {
    console.warn("[generate-phase1-pdf] Blob upload error:", err)
    return null
  }
}

export async function renderPhase1PdfBufferDirect(
  incident: IncidentDocument,
  facilityName: string,
): Promise<Buffer> {
  const waikLogoSrc = getWaikLogoDataUrlForPdf()
  const pdfBuffer = await renderToBuffer(
    React.createElement(Phase1PdfTemplate, {
      incident,
      facilityName,
      waikLogoSrc,
    }) as React.ReactElement,
  )
  return Buffer.from(pdfBuffer)
}

export async function renderPhase1PdfBuffer(
  incident: IncidentDocument,
  facilityName: string,
): Promise<Buffer> {
  if (shouldUsePdfSubprocess()) {
    return renderPhase1PdfBufferSubprocess(incident, facilityName)
  }
  return renderPhase1PdfBufferDirect(incident, facilityName)
}

export async function generatePhase1Pdf(
  incidentId: string,
  facilityId: string,
): Promise<string | null> {
  try {
    await connectMongo()
    const { default: IncidentModel } = await import("@/backend/src/models/incident.model")

    const incident = leanOne<IncidentDocument>(
      await IncidentModel.findOne({ id: incidentId, facilityId }).lean().exec(),
    )
    if (!incident) {
      console.warn("[generate-phase1-pdf] Incident not found:", incidentId)
      return null
    }

    const facility = await FacilityModel.findOne({ id: facilityId }).select("name").lean().exec()
    const facilityName =
      typeof (facility as { name?: string } | null)?.name === "string"
        ? String((facility as { name?: string }).name).trim() || "Community"
        : "Community"

    const pdfBuffer = await renderPhase1PdfBuffer(incident, facilityName)

    let pdfUrl = await uploadToBlobStorage(pdfBuffer, incidentId)

    if (!pdfUrl) {
      pdfUrl = `/api/incidents/${incidentId}/report/pdf`
    }

    await IncidentModel.updateOne(
      { id: incidentId, facilityId },
      { $set: { "initialReport.signature.reportPdfUrl": pdfUrl, updatedAt: new Date() } },
    ).exec()

    return pdfUrl
  } catch (err) {
    console.warn("[generate-phase1-pdf] Failed:", err)
    return null
  }
}
