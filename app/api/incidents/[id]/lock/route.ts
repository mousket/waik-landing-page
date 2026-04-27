import { NextResponse, type NextRequest } from "next/server"
import IncidentModel from "@/backend/src/models/incident.model"
import { actorNameFromUser, logActivity } from "@/lib/activity-logger"
import { getIncidentById } from "@/lib/db"
import { areAllPhase2SectionsComplete } from "@/lib/phase2-section-helpers"
import { notifyReportingStaffInvestigationClosed } from "@/lib/phase2-notifications"
import { loadPhase2Incident } from "@/lib/phase2-server"
import type { IncidentPhase2Sections } from "@/lib/types"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: incidentId } = await context.params
  const r = await loadPhase2Incident(incidentId)
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status })
  }
  const { user, doc, facilityId } = r
  const ph = String(doc["phase"] ?? "")

  if (ph !== "phase_2_in_progress" && !user.isWaikSuperAdmin) {
    return NextResponse.json({ error: "Only in-progress investigations can be locked." }, { status: 400 })
  }

  const inv = doc["investigation"] as
    | { signatures?: { don?: unknown; admin?: unknown } }
    | undefined
  if (!inv?.signatures?.don || !inv?.signatures?.admin) {
    return NextResponse.json(
      { error: "Both the Director of Nursing and an administrator must sign before locking." },
      { status: 400 },
    )
  }

  const p2 = doc["phase2Sections"] as Partial<IncidentPhase2Sections> | undefined
  if (!areAllPhase2SectionsComplete(p2) && !user.isWaikSuperAdmin) {
    return NextResponse.json(
      { error: "All four investigation sections must be complete before locking." },
      { status: 400 },
    )
  }

  const now = new Date()
  const performedByName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email

  await IncidentModel.updateOne(
    { id: incidentId, facilityId },
    {
      $set: {
        phase: "closed",
        status: "closed",
        "phaseTransitionTimestamps.phase2Locked": now,
        updatedAt: now,
      },
      $push: {
        auditTrail: {
          action: "locked" as const,
          performedBy: user.userId,
          performedByName,
          timestamp: now,
        },
      },
    },
  ).exec()

  const out = await getIncidentById(incidentId, facilityId)
  if (!out) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  logActivity({
    userId: user.userId,
    userName: actorNameFromUser(user),
    role: user.roleSlug,
    facilityId,
    action: "investigation_closed",
    resourceType: "incident",
    resourceId: incidentId,
    req: request,
  })

  try {
    const staffId = String((doc as { staffId?: string }).staffId ?? "")
    if (staffId) {
      void notifyReportingStaffInvestigationClosed({
        staffId,
        incidentId,
        incidentTitle: out.title,
      })
    }
  } catch (e) {
    console.error("[lock] reporting staff notification", e)
  }

  return NextResponse.json(out)
}
