import * as React from "react"
import { render } from "@react-email/render"

import { Phase1ReportEmail } from "@/emails/phase1-report"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { getEmailAppBaseUrl } from "@/emails/email-assets"
import { isEmailConfigured, resend } from "@/lib/email"
import { renderPhase1PdfBuffer } from "@/lib/report/generate-phase1-pdf"

export class EmailNotConfiguredError extends Error {
  readonly status = 503

  constructor() {
    super("Email is not configured (RESEND_API_KEY / RESEND_KEY and EMAIL_FROM)")
    this.name = "EmailNotConfiguredError"
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmailAddress(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "report"
}

function formatSignedAtLabel(value: unknown): string {
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toLocaleString()
  }
  return new Date().toLocaleString()
}

function shouldAttachPdf(requestAttachPdf: boolean): boolean {
  if (process.env.PHASE1_EMAIL_ATTACH_PDF === "false") return false
  return requestAttachPdf
}

export async function sendPhase1ReportEmail({
  to,
  incident,
  facilityName,
  senderName,
  attachPdf = true,
}: {
  to: string
  incident: IncidentDocument
  facilityName: string
  senderName?: string
  attachPdf?: boolean
}): Promise<void> {
  if (!isEmailConfigured() || !resend) {
    throw new EmailNotConfiguredError()
  }
  const from = process.env.EMAIL_FROM
  if (!from) throw new EmailNotConfiguredError()

  const recipient = to.trim()
  const ir = incident.initialReport
  const snapshot = ir?.phase1SignoffSnapshot
  const signedAt = formatSignedAtLabel(snapshot?.signedAt ?? ir?.signature?.signedAt)
  const residentName = incident.residentName?.trim() || "Resident"
  const incidentType = String(incident.incidentType ?? incident.title ?? "incident").replace(/_/g, " ")
  const base = getEmailAppBaseUrl()
  const reportUrl = `${base}/staff/incidents/${encodeURIComponent(incident.id)}/report`

  const html = await render(
    React.createElement(Phase1ReportEmail, {
      facilityName,
      residentName,
      incidentType,
      signedAt,
      reportUrl,
      senderName,
    }),
  )

  const datePart =
    incident.incidentDate instanceof Date
      ? incident.incidentDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  const filename = `Phase1-Report-${sanitizeFilenamePart(residentName)}-${datePart}.pdf`

  const payload: Parameters<typeof resend.emails.send>[0] = {
    from,
    to: recipient,
    subject: `Signed Phase 1 report — ${residentName} (${facilityName})`,
    html,
  }

  if (shouldAttachPdf(attachPdf)) {
    const pdfBuffer = await renderPhase1PdfBuffer(incident, facilityName)
    payload.attachments = [
      {
        filename,
        content: pdfBuffer,
      },
    ]
  }

  const result = await resend.emails.send(payload)
  if (result.error) {
    throw new Error(result.error.message || "Failed to send email")
  }
}
