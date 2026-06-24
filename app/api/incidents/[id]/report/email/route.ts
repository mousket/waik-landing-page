import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { leanOne } from "@/lib/mongoose-lean"
import { isIncidentReporter } from "@/lib/staff-incident-access"
import {
  EmailNotConfiguredError,
  isValidEmailAddress,
  sendPhase1ReportEmail,
} from "@/lib/send-phase1-report-email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const SIGNED_PHASES = new Set(["phase_1_complete", "phase_2_in_progress", "closed"])

// Optional cooldown: one email per incident per minute per sender (in-memory; resets on deploy).
const recentSends = new Map<string, number>()
const SEND_COOLDOWN_MS = 60_000

function sendCooldownKey(incidentId: string, userId: string): string {
  return `${incidentId}:${userId}`
}

export async function POST(
  request: Request,
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

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const to = typeof body.to === "string" ? body.to.trim() : ""
  const attachPdf = body.attachPdf !== false

  if (!to) {
    return NextResponse.json({ error: "Email address required" }, { status: 400 })
  }
  if (!isValidEmailAddress(to)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
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

  const cooldownKey = sendCooldownKey(incidentId, user.userId)
  const lastSent = recentSends.get(cooldownKey) ?? 0
  if (Date.now() - lastSent < SEND_COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Please wait a moment before sending another email for this report." },
      { status: 429 },
    )
  }

  const facility = await FacilityModel.findOne({ id: facilityId }).select("name").lean().exec()
  const facilityName =
    typeof (facility as { name?: string } | null)?.name === "string"
      ? String((facility as { name?: string }).name).trim() || "Community"
      : "Community"

  const senderName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || undefined

  try {
    await sendPhase1ReportEmail({
      to,
      incident,
      facilityName,
      senderName,
      attachPdf,
    })
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM to enable report email.",
        },
        { status: 503 },
      )
    }
    console.error("[report/email] Send failed:", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }

  recentSends.set(cooldownKey, Date.now())

  const now = new Date()
  await IncidentModel.updateOne(
    { id: incidentId, facilityId },
    {
      $push: {
        auditTrail: {
          action: "phase1_report_emailed",
          performedBy: user.userId,
          performedByName: senderName ?? user.email,
          timestamp: now,
          newValue: to,
          reason: attachPdf ? "with_pdf_attachment" : "link_only",
        },
      },
      $set: { updatedAt: now },
    },
  ).exec()

  return NextResponse.json({
    ok: true,
    message: attachPdf ? "Report emailed with PDF attached" : "Report emailed with secure link",
  })
}
