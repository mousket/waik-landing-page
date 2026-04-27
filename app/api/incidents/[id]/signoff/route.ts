import { NextResponse, type NextRequest } from "next/server"
import IncidentModel from "@/backend/src/models/incident.model"
import { getIncidentById } from "@/lib/db"
import { notifyAfterSignoff } from "@/lib/phase2-notifications"
import { isWaikDonOrAdmin, loadPhase2Incident } from "@/lib/phase2-server"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: incidentId } = await context.params
  const r = await loadPhase2Incident(incidentId)
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status })
  }
  const { user, doc, facilityId } = r
  const ph = String(doc["phase"] ?? "")

  if (ph === "closed") {
    return NextResponse.json({ error: "Investigation is closed. Unlock to change signatures." }, { status: 400 })
  }
  if (ph !== "phase_2_in_progress" && !user.isWaikSuperAdmin) {
    return NextResponse.json({ error: "Sign-off is not available in the current phase." }, { status: 400 })
  }

  let body: { role?: string; signatureName?: string; declaration?: string }
  try {
    body = (await request.json()) as { role?: string; signatureName?: string; declaration?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const role = body.role
  if (role !== "don" && role !== "administrator") {
    return NextResponse.json({ error: "role must be don or administrator" }, { status: 400 })
  }
  const name = (body.signatureName ?? "").trim()
  if (name.length < 2) {
    return NextResponse.json({ error: "signatureName is required" }, { status: 400 })
  }
  if (role === "don") {
    const a = isWaikDonOrAdmin(user, "don")
    if (!a.ok) return NextResponse.json({ error: a.error }, { status: 403 })
  } else {
    const a = isWaikDonOrAdmin(user, "administrator")
    if (!a.ok) return NextResponse.json({ error: a.error }, { status: 403 })
  }

  const declaration =
    (body.declaration ?? "").trim() || "I certify the investigation record is complete and accurate to the best of my knowledge."
  const now = new Date()
  const entry = {
    signedBy: user.userId,
    signedByName: name,
    signedAt: now,
    role: role === "don" ? "director_of_nursing" : "administrator",
    declaration,
  }

  const path = role === "don" ? "investigation.signatures.don" : "investigation.signatures.admin"
  const $set: Record<string, unknown> = {
    [path]: entry,
    "investigation.status": "in-progress",
    updatedAt: now,
  }

  await IncidentModel.updateOne(
    { id: incidentId, facilityId },
    { $set },
  ).exec()

  const out = await getIncidentById(incidentId, facilityId)
  if (!out) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const inv = out.investigation?.signatures
    if (role === "don" && inv?.don && !inv?.admin) {
      void notifyAfterSignoff({
        facilityId,
        incidentId,
        incidentTitle: out.title,
        signedAs: "don",
      })
    } else if (role === "administrator" && inv?.admin && !inv?.don) {
      void notifyAfterSignoff({
        facilityId,
        incidentId,
        incidentTitle: out.title,
        signedAs: "administrator",
      })
    }
  } catch (e) {
    console.error("[signoff] phase2 nudge notification", e)
  }

  return NextResponse.json(out)
}
