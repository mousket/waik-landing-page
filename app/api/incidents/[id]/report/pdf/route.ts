import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { Phase1PdfTemplate } from "@/components/staff/phase1-pdf-template"
import { getCurrentUser } from "@/lib/auth"
import { leanOne } from "@/lib/mongoose-lean"
import { isIncidentReporter } from "@/lib/staff-incident-access"
import { generatePhase1Pdf } from "@/lib/report/generate-phase1-pdf"
import { getWaikLogoDataUrlForPdf } from "@/lib/waik-logo-asset"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const SIGNED_PHASES = new Set(["phase_1_complete", "phase_2_in_progress", "closed"])

function isExternalPdfUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://")
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const incidentId = String(id ?? "").trim()
  if (!incidentId) {
    return NextResponse.json({ error: "Invalid incident id" }, { status: 400 })
  }

  const facilityId = user.facilityId?.trim()
  if (!facilityId) {
    return NextResponse.json({ error: "Facility required" }, { status: 400 })
  }

  await connectMongo()
  const { default: IncidentModel } = await import("@/backend/src/models/incident.model")

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOne({ id: incidentId, facilityId }).lean().exec(),
  )
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 })
  }

  const isReporter = isIncidentReporter(incident, user)
  const isAdmin = user.isAdminTier || user.isWaikSuperAdmin
  if (!isReporter && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!SIGNED_PHASES.has(String(incident.phase ?? ""))) {
    return NextResponse.json(
      { error: "Report not yet finalized. Complete sign-off first." },
      { status: 400 },
    )
  }

  const cachedUrl = incident.initialReport?.signature?.reportPdfUrl?.trim()
  if (cachedUrl && isExternalPdfUrl(cachedUrl)) {
    return NextResponse.redirect(cachedUrl, 302)
  }

  const facility = await FacilityModel.findOne({ id: facilityId }).select("name").lean().exec()
  const facilityName =
    typeof (facility as { name?: string } | null)?.name === "string"
      ? String((facility as { name?: string }).name).trim() || "Community"
      : "Community"

  try {
    const waikLogoSrc = getWaikLogoDataUrlForPdf()
    const pdfBuffer = await renderToBuffer(
      React.createElement(Phase1PdfTemplate, {
        incident,
        facilityName,
        waikLogoSrc,
      }) as React.ReactElement,
    )

    void generatePhase1Pdf(incidentId, facilityId).catch((err) => {
      console.warn("[report/pdf] Async URL persist failed:", err)
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="phase1-report-${incidentId}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[report/pdf] Generation failed:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
