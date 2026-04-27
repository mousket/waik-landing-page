import { NextResponse, type NextRequest } from "next/server"
import IncidentModel from "@/backend/src/models/incident.model"
import { getIncidentById } from "@/lib/db"
import { loadPhase2Incident } from "@/lib/phase2-server"
import { isAdminRole } from "@/lib/waik-roles"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: incidentId } = await context.params
  const r = await loadPhase2Incident(incidentId)
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status })
  }
  const { user, doc, facilityId } = r

  const slug = (user.roleSlug ?? "").toLowerCase()
  const canUnlock =
    user.isWaikSuperAdmin ||
    slug === "director_of_nursing" ||
    slug === "administrator" ||
    slug === "owner" ||
    (isAdminRole(slug) && user.canAccessPhase2)
  if (!canUnlock) {
    return NextResponse.json(
      { error: "Only the Director of Nursing or an administrator can unlock an investigation." },
      { status: 403 },
    )
  }

  if (String(doc["phase"] ?? "") !== "closed") {
    return NextResponse.json({ error: "This investigation is not closed." }, { status: 400 })
  }

  let body: { reason?: string }
  try {
    body = (await request.json()) as { reason?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const reason = (body.reason ?? "").trim()
  if (reason.length < 20) {
    return NextResponse.json({ error: "Reason must be at least 20 characters." }, { status: 400 })
  }

  const now = new Date()
  const performedByName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email

  await IncidentModel.updateOne(
    { id: incidentId, facilityId },
    {
      $set: {
        phase: "phase_2_in_progress",
        status: "in-progress",
        updatedAt: now,
        "investigation.signatures": {},
      },
      $push: {
        auditTrail: {
          action: "unlocked" as const,
          performedBy: user.userId,
          performedByName,
          timestamp: now,
          reason,
        },
      },
    },
  ).exec()

  const out = await getIncidentById(incidentId, facilityId)
  if (!out) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(out)
}
