import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import InterventionModel from "@/backend/src/models/intervention.model"
import { getIncidentById } from "@/lib/db"
import { areAllPhase2SectionsComplete } from "@/lib/phase2-section-helpers"
import { defaultPhase2Sections, sectionNameFromParam } from "@/lib/phase2-default-sections"
import { notifyFacilityDonAndAdminsAllSectionsComplete } from "@/lib/phase2-notifications"
import { loadPhase2Incident } from "@/lib/phase2-server"
import type { IncidentPhase2Sections, Phase2SectionStatus } from "@/lib/types"

function mergeSection(
  key: keyof IncidentPhase2Sections,
  current: IncidentPhase2Sections,
  body: Record<string, unknown>,
  userId: string,
): { next: IncidentPhase2Sections; error?: string } {
  const now = new Date()
  const base = { ...current } as unknown as Record<string, unknown>
  const markComplete = (status: Phase2SectionStatus) => {
    if (status === "complete") {
      return { completedAt: now, completedBy: userId }
    }
    return { completedAt: undefined, completedBy: undefined }
  }

  if (key === "contributingFactors") {
    const status = (body.status as Phase2SectionStatus) ?? current.contributingFactors.status
    const factors = Array.isArray(body.factors) ? (body.factors as string[]) : current.contributingFactors.factors
    const notes = typeof body.notes === "string" ? body.notes : current.contributingFactors.notes
    if (status === "complete" && (!factors || factors.length < 1)) {
      return { next: current, error: "Select at least one contributing factor before completing this section." }
    }
    base.contributingFactors = {
      ...current.contributingFactors,
      status,
      factors: factors ?? [],
      notes,
      ...markComplete(status),
    }
    return { next: base as unknown as IncidentPhase2Sections }
  }

  if (key === "rootCause") {
    const status = (body.status as Phase2SectionStatus) ?? current.rootCause.status
    const description =
      typeof body.description === "string" ? body.description : (current.rootCause.description ?? "")
    if (status === "complete" && description.trim().length < 50) {
      return { next: current, error: "Root cause must be at least 50 characters." }
    }
    base.rootCause = {
      ...current.rootCause,
      status,
      description,
      ...markComplete(status),
    }
    return { next: base as unknown as IncidentPhase2Sections }
  }

  if (key === "interventionReview") {
    const status = (body.status as Phase2SectionStatus) ?? current.interventionReview.status
    const reviewedInterventions = Array.isArray(body.reviewedInterventions)
      ? (body.reviewedInterventions as IncidentPhase2Sections["interventionReview"]["reviewedInterventions"])
      : current.interventionReview.reviewedInterventions
    base.interventionReview = {
      ...current.interventionReview,
      status,
      reviewedInterventions: reviewedInterventions ?? [],
      ...markComplete(status),
    }
    return { next: base as unknown as IncidentPhase2Sections }
  }

  if (key === "newIntervention") {
    const status = (body.status as Phase2SectionStatus) ?? current.newIntervention.status
    const interventions = Array.isArray(body.interventions)
      ? (body.interventions as IncidentPhase2Sections["newIntervention"]["interventions"])
      : current.newIntervention.interventions
    if (status === "complete" && (!interventions || interventions.length < 1)) {
      return { next: current, error: "Add at least one new intervention before completing this section." }
    }
    base.newIntervention = {
      ...current.newIntervention,
      status,
      interventions: interventions ?? [],
      ...markComplete(status),
    }
    return { next: base as unknown as IncidentPhase2Sections }
  }

  return { next: current, error: "Invalid section" }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; sectionName: string }> },
) {
  const { id: incidentId, sectionName: param } = await context.params
  const key = sectionNameFromParam(param)
  if (!key) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 })
  }

  const r = await loadPhase2Incident(incidentId)
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status })
  }

  const { user, doc, facilityId } = r
  const ph = String(doc["phase"] ?? "")
  if (ph === "closed") {
    return NextResponse.json({ error: "This investigation is closed. Unlock it to make changes." }, { status: 400 })
  }
  if (ph !== "phase_2_in_progress" && !user.isWaikSuperAdmin) {
    return NextResponse.json(
      { error: "Section edits are only allowed while the investigation is in progress." },
      { status: 400 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (key === "interventionReview" && body.status === "complete" && (doc as { residentId?: string }).residentId) {
    await connectMongo()
    const residentId = String((doc as { residentId?: string }).residentId)
    const list = (await InterventionModel.find({ facilityId, residentId }).lean().exec()) as unknown as Array<{
      id: string
    }>
    const ids = new Set(list.map((r) => r.id).filter(Boolean))
    const rev = (body.reviewedInterventions as
      | Array<{ interventionId: string; stillEffective?: boolean }>
      | undefined) ?? []
    if (ids.size > 0) {
      for (const intId of ids) {
        const row = rev.find((r) => r.interventionId === intId)
        if (!row || typeof row.stillEffective !== "boolean") {
          return NextResponse.json(
            { error: "Record a decision (still effective or not) for every current intervention on file before completing this section." },
            { status: 400 },
          )
        }
      }
    }
  }

  const p2 = doc["phase2Sections"] as Partial<IncidentPhase2Sections> | undefined
  const def = defaultPhase2Sections()
  const current: IncidentPhase2Sections = {
    contributingFactors: { ...def.contributingFactors, ...p2?.contributingFactors, factors: p2?.contributingFactors?.factors ?? def.contributingFactors.factors },
    rootCause: { ...def.rootCause, ...p2?.rootCause },
    interventionReview: { ...def.interventionReview, ...p2?.interventionReview, reviewedInterventions: p2?.interventionReview?.reviewedInterventions ?? def.interventionReview.reviewedInterventions },
    newIntervention: { ...def.newIntervention, ...p2?.newIntervention, interventions: p2?.newIntervention?.interventions ?? def.newIntervention.interventions },
  }

  const { next, error } = mergeSection(key, current, body, user.userId)
  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }

  const wasAllComplete = areAllPhase2SectionsComplete(current)
  const nowAllComplete = areAllPhase2SectionsComplete(next)

  const n = await IncidentModel.updateOne(
    { id: incidentId, facilityId },
    {
      $set: {
        phase2Sections: next,
        updatedAt: new Date(),
      },
    },
  ).exec()

  if (n.matchedCount === 0) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }

  if (nowAllComplete && !wasAllComplete) {
    try {
      const gate = await IncidentModel.updateOne(
        {
          id: incidentId,
          facilityId,
          $or: [
            { phase2NotificationFlags: { $exists: false } },
            { "phase2NotificationFlags.allSectionsCompleteNotifiedAt": { $exists: false } },
            { "phase2NotificationFlags.allSectionsCompleteNotifiedAt": null },
          ],
        },
        {
          $set: {
            "phase2NotificationFlags.allSectionsCompleteNotifiedAt": new Date(),
            updatedAt: new Date(),
          },
        },
      ).exec()
      if (gate.modifiedCount > 0) {
        const title = typeof doc["title"] === "string" ? doc["title"] : "Incident"
        void notifyFacilityDonAndAdminsAllSectionsComplete({
          facilityId,
          incidentId,
          incidentTitle: title,
        })
      }
    } catch (e) {
      console.error("[section PATCH] phase2 all-complete notification", e)
    }
  }

  const out = await getIncidentById(incidentId, facilityId)
  if (!out) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(out)
}
