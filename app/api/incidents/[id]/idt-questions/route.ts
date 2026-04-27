import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { addQuestionToIncident, getIncidentById } from "@/lib/db"
import { loadPhase2Incident } from "@/lib/phase2-server"

const MAX_LEN = 4000

/**
 * Create a Phase 2 IDT question on the incident. Persists in `incident.questions` with
 * `metadata.idt: true` and `assignedTo: [targetUserId]`. `targetUserId` must be on `idtTeam`.
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
    return NextResponse.json(
      { error: "IDT questions can only be sent while Phase 2 is in progress." },
      { status: 400 },
    )
  }

  const body = (await request.json()) as { targetUserId?: string; questionText?: string }
  const targetUserId = (body.targetUserId || "").trim()
  const questionText = (body.questionText || "").trim()
  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId is required" }, { status: 400 })
  }
  if (questionText.length < 3) {
    return NextResponse.json({ error: "questionText must be at least 3 characters." }, { status: 400 })
  }
  if (questionText.length > MAX_LEN) {
    return NextResponse.json({ error: "questionText is too long." }, { status: 400 })
  }

  const idt: Array<{ userId: string }> = Array.isArray(doc["idtTeam"]) ? (doc["idtTeam"] as Array<{ userId: string }>) : []
  if (!idt.some((m) => m.userId === targetUserId)) {
    return NextResponse.json(
      { error: "Add that person to the IDT list before sending them a question." },
      { status: 400 },
    )
  }

  const askedByName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email
  const created = await addQuestionToIncident(incidentId, incFacilityId, {
    questionText,
    askedBy: user.userId,
    askedByName,
    assignedTo: [targetUserId],
    source: "manual",
    metadata: { idt: true, idtTargetUserId: targetUserId },
  })

  if (!created) {
    return NextResponse.json({ error: "Could not add question" }, { status: 500 })
  }

  const now = new Date()
  await connectMongo()
  const snippet = questionText.length > 500 ? `${questionText.slice(0, 497)}…` : questionText
  await IncidentModel.updateOne(
    { id: incidentId, facilityId: incFacilityId },
    {
      $set: {
        "idtTeam.$[m].questionSent": snippet,
        "idtTeam.$[m].questionSentAt": now,
        "idtTeam.$[m].status": "pending",
        updatedAt: now,
      },
    },
    { arrayFilters: [{ "m.userId": targetUserId }] },
  ).exec()

  const out = await getIncidentById(incidentId, incFacilityId)
  if (!out) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ question: created, incident: out })
}
