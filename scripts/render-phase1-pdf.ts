/**
 * Isolated Phase 1 PDF renderer (runs outside the Next.js webpack bundle).
 * Usage: npx tsx scripts/render-phase1-pdf.ts <input.json> <output.pdf>
 */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"

import type { IncidentDocument } from "../backend/src/models/incident.model"
import { Phase1PdfTemplate } from "../components/staff/phase1-pdf-template"
import { getWaikLogoDataUrlForPdf } from "../lib/waik-logo-asset"

function reviveDates(incident: IncidentDocument): IncidentDocument {
  const revive = (value: unknown): unknown => {
    if (typeof value !== "string") return value
    if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? value : d
  }

  const out = structuredClone(incident) as IncidentDocument
  out.incidentDate = revive(out.incidentDate) as IncidentDocument["incidentDate"]
  out.createdAt = revive(out.createdAt) as IncidentDocument["createdAt"]
  out.updatedAt = revive(out.updatedAt) as IncidentDocument["updatedAt"]
  if (out.initialReport) {
    out.initialReport.capturedAt = revive(
      out.initialReport.capturedAt,
    ) as IncidentDocument["initialReport"]["capturedAt"]
    if (out.initialReport.signature?.signedAt) {
      out.initialReport.signature.signedAt = revive(
        out.initialReport.signature.signedAt,
      ) as NonNullable<IncidentDocument["initialReport"]["signature"]>["signedAt"]
    }
    if (out.initialReport.phase1SignoffSnapshot?.signedAt) {
      out.initialReport.phase1SignoffSnapshot.signedAt = revive(
        out.initialReport.phase1SignoffSnapshot.signedAt,
      ) as NonNullable<
        NonNullable<IncidentDocument["initialReport"]>["phase1SignoffSnapshot"]
      >["signedAt"]
    }
  }
  return out
}

async function main() {
  const inputPath = path.resolve(process.argv[2] ?? "")
  const outputPath = path.resolve(process.argv[3] ?? "")
  if (!inputPath || !outputPath) {
    console.error("Usage: tsx scripts/render-phase1-pdf.ts <input.json> <output.pdf>")
    process.exit(1)
  }

  const raw = JSON.parse(readFileSync(inputPath, "utf8")) as {
    incident: IncidentDocument
    facilityName: string
  }
  const incident = reviveDates(raw.incident)
  const waikLogoSrc = getWaikLogoDataUrlForPdf()

  const pdfBuffer = await renderToBuffer(
    React.createElement(Phase1PdfTemplate, {
      incident,
      facilityName: raw.facilityName,
      waikLogoSrc,
    }) as React.ReactElement,
  )

  writeFileSync(outputPath, Buffer.from(pdfBuffer))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
