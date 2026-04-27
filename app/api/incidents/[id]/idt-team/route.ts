import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import type { UserDocument } from "@/backend/src/models/user.model"
import UserModel from "@/backend/src/models/user.model"
import { getIncidentById } from "@/lib/db"
import { leanOne } from "@/lib/mongoose-lean"
import { loadPhase2Incident } from "@/lib/phase2-server"

type IdtEntry = {
  userId: string
  name: string
  role: string
  status?: "pending" | "answered"
}

/**
 * Add/remove IDT team members. Facility-scoped user lookup, Phase 2 only, `canAccessPhase2` (see loadPhase2Incident).
 * Remove: blocked while the member has an open Phase 2 IDT question (no answer) assigned to them.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: incidentId } = await context.params
  const r = await loadPhase2Incident(incidentId)
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status })
  }
  const { user, doc, facilityId: incFacilityId } = r
  const ph = String(doc["phase"] ?? "")
  if (ph !== "phase_2_in_progress") {
    return NextResponse.json({ error: "IDT roster can only be edited while Phase 2 is in progress." }, { status: 400 })
  }

  const body = (await request.json()) as { userId?: string }
  const targetId = (body.userId || "").trim()
  if (!targetId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  await connectMongo()
  const staff = leanOne<UserDocument>(
    await UserModel.findOne({
      id: targetId,
      facilityId: incFacilityId,
      isWaikSuperAdmin: { $ne: true },
    })
      .lean()
      .exec(),
  )
  if (!staff || !staff.isActive) {
    return NextResponse.json(
      { error: "User not found in this facility or is inactive." },
      { status: 400 },
    )
  }

  const existing: IdtEntry[] = Array.isArray(doc["idtTeam"]) ? (doc["idtTeam"] as IdtEntry[]) : []
  if (existing.some((m) => m.userId === targetId)) {
    return NextResponse.json({ error: "That person is already on the IDT list." }, { status: 400 })
  }

  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ").trim() || staff.email
  const entry: IdtEntry = {
    userId: targetId,
    name,
    role: String(staff.roleSlug ?? "staff").replace(/_/g, " "),
    status: "pending",
  }
  const performedByName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email
  const now = new Date()

  await IncidentModel.updateOne(
    { id: incidentId, facilityId: incFacilityId },
    {
      $set: { updatedAt: now },
      $push: {
        idtTeam: entry,
        auditTrail: {
          action: "idt_roster_changed" as const,
          performedBy: user.userId,
          performedByName,
          timestamp: now,
          newValue: `add:${targetId}`,
        },
      },
    },
  ).exec()

  const out = await getIncidentById(incidentId, incFacilityId)
  if (!out) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ incident: out, added: entry })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: incidentId } = await context.params
  const r = await loadPhase2Incident(incidentId)
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status })
  }
  const { user, doc, facilityId: incFacilityId } = r
  const ph = String(doc["phase"] ?? "")
  if (ph !== "phase_2_in_progress") {
    return NextResponse.json({ error: "IDT roster can only be edited while Phase 2 is in progress." }, { status: 400 })
  }

  const url = new URL(request.url)
  const targetId = (url.searchParams.get("userId") || "").trim()
  if (!targetId) {
    return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 })
  }

  const questions = (doc["questions"] as Array<{ assignedTo?: string[]; answer?: unknown; metadata?: { idt?: boolean } }>) || []
  const hasOpenIdt = questions.some(
    (q) => q?.metadata?.idt && (q.assignedTo ?? []).includes(targetId) && !q.answer,
  )
  if (hasOpenIdt) {
    return NextResponse.json(
      { error: "Remove or resolve open IDT questions for this person before removing them from the team." },
      { status: 400 },
    )
  }

  const existing: IdtEntry[] = Array.isArray(doc["idtTeam"]) ? (doc["idtTeam"] as IdtEntry[]) : []
  if (!existing.some((m) => m.userId === targetId)) {
    return NextResponse.json({ error: "That person is not on the IDT list." }, { status: 400 })
  }

  const performedByName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email
  const now = new Date()

  await IncidentModel.updateOne(
    { id: incidentId, facilityId: incFacilityId },
    {
      $set: { updatedAt: now },
      $pull: { idtTeam: { userId: targetId } },
      $push: {
        auditTrail: {
          action: "idt_roster_changed" as const,
          performedBy: user.userId,
          performedByName,
          timestamp: now,
          newValue: `remove:${targetId}`,
        },
      },
    },
  ).exec()

  const out = await getIncidentById(incidentId, incFacilityId)
  if (!out) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ incident: out })
}
