import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { getCurrentUser } from "@/lib/auth"
import type { IncidentPhase } from "@/lib/types/incident-summary"

const VALID_TRANSITIONS: Record<string, IncidentPhase[]> = {
  phase_1_complete: ["phase_2_in_progress"],
  phase_2_in_progress: ["closed"],
  closed: [],
  phase_1_in_progress: [],
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!currentUser.isAdminTier && !currentUser.isWaikSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const incidentId = params.id

  try {
    const body = (await request.json()) as { phase?: string }
    const phase = body.phase as IncidentPhase | undefined
    if (!phase || typeof phase !== "string") {
      return NextResponse.json({ error: "phase is required" }, { status: 400 })
    }

    if (phase === "phase_2_in_progress" && !currentUser.canAccessPhase2 && !currentUser.isWaikSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (phase === "closed" && !currentUser.canAccessPhase2 && !currentUser.isWaikSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectMongo()

    const incident = await IncidentModel.findOne({ id: incidentId }).exec()
    if (!incident) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const facId = String(incident.facilityId ?? "")
    if (!currentUser.isWaikSuperAdmin) {
      if (!currentUser.facilityId || facId !== currentUser.facilityId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const fromPhase = String(incident.phase)
    const allowed = VALID_TRANSITIONS[fromPhase] ?? []
    if (!allowed.includes(phase)) {
      return NextResponse.json({ error: `Cannot transition from ${fromPhase} to ${phase}` }, { status: 400 })
    }

    const now = new Date()
    const investigatorName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email

    const $set: Record<string, unknown> = {
      phase,
      updatedAt: now,
    }

    if (phase === "phase_2_in_progress") {
      $set.investigatorId = currentUser.userId
      $set.investigatorName = investigatorName
      $set.status = "in-progress"
      $set["phaseTransitionTimestamps.phase2Claimed"] = now
    }

    if (phase === "closed") {
      $set.status = "closed"
      $set["phaseTransitionTimestamps.phase2Locked"] = now
    }

    const auditEntry = {
      action: "phase_transitioned" as const,
      performedBy: currentUser.userId,
      performedByName: investigatorName,
      timestamp: now,
      previousValue: fromPhase,
      newValue: phase,
    }

    await IncidentModel.updateOne(
      { id: incidentId },
      {
        $set,
        $push: { auditTrail: auditEntry },
      },
    )

    console.log(`[Phase transition] ${incidentId}: ${fromPhase} → ${phase} by ${currentUser.userId}`)

    return NextResponse.json({ success: true, newPhase: phase })
  } catch (e) {
    console.error("[PATCH /api/incidents/[id]/phase]", e)
    return NextResponse.json({ error: "Failed to update phase" }, { status: 500 })
  }
}
