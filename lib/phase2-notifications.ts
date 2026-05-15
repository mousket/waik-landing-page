import connectMongo from "@/backend/src/lib/mongodb"
import UserModel from "@/backend/src/models/user.model"
import IncidentModel from "@/backend/src/models/incident.model"
import { enqueueIncidentNotifications } from "@/lib/notification-service"

async function loadIncidentPeek(incidentId: string, facilityId: string) {
  await connectMongo()
  const raw = await IncidentModel.findOne({ id: incidentId, facilityId })
    .select(["residentRoom", "residentName", "title"])
    .lean()
    .exec()

  const o = raw as { residentRoom?: string; residentName?: string; title?: string } | null

  return {
    room: (o?.residentRoom ?? "").trim() || "—",
    residentName: (o?.residentName ?? "").trim(),
  }
}

/** Phase 2: all investigation sections filled — DON/admin/owner inbox + urgent push when configured. */
export async function notifyFacilityDonAndAdminsAllSectionsComplete(options: {
  facilityId: string
  incidentId: string
  incidentTitle: string
}): Promise<void> {
  const { facilityId, incidentId, incidentTitle } = options
  try {
    await connectMongo()
    const users = await UserModel.find({
      facilityId,
      isActive: true,
      roleSlug: { $in: ["director_of_nursing", "administrator", "owner"] },
    })
      .select(["id"])
      .lean()
      .exec()

    const peek = await loadIncidentPeek(incidentId, facilityId)

    const titleForMsg = `${incidentTitle.slice(0, 80)}${incidentTitle.length > 80 ? "…" : ""}`
    const msg = `All four investigation sections are complete for "${titleForMsg}". You can proceed to sign-off.`
    const actionUrl = `/admin/incidents/${incidentId}`

    const targetUserIds = users
      .map((udoc) => String((udoc as { id?: string }).id ?? ""))
      .filter(Boolean)

    if (targetUserIds.length === 0) return

    enqueueIncidentNotifications({
      facilityId,
      incidentId,
      type: "phase2-all-sections-complete",
      message: msg,
      actionUrl,
      actorName: "WAiK",
      priority: "urgent",
      targetUserIds,
      push: {
        titlePersonal: `Investigation ready for sign-off — Room ${peek.room}`,
        titleWork: `Investigation ready for sign-off — Room ${peek.room}`,
        bodyPersonal: "All sections complete. Both signatures needed to lock.",
        bodyWork:
          peek.residentName.length > 0
            ? `All sections complete for ${peek.residentName}. Both signatures needed to lock.`
            : "All sections complete. Both signatures needed to lock.",
        url: actionUrl,
      },
    })
  } catch (e) {
    console.error("[Phase2 notify] notifyFacilityDonAndAdminsAllSectionsComplete", e)
  }
}

/**
 * One party signed; the other role still needs a signature. Nudges the appropriate facility users.
 */
export async function notifyAfterSignoff(options: {
  facilityId: string
  incidentId: string
  incidentTitle: string
  signedAs: "don" | "administrator"
}): Promise<void> {
  const { facilityId, incidentId, incidentTitle, signedAs } = options
  try {
    await connectMongo()
    const needAdmin = signedAs === "don"
    const roleSlugs = needAdmin ? (["administrator", "owner"] as const) : (["director_of_nursing"] as const)
    const users = await UserModel.find({
      facilityId,
      isActive: true,
      roleSlug: { $in: roleSlugs },
    })
      .select(["id"])
      .lean()
      .exec()

    const other = needAdmin ? "An administrator" : "The Director of Nursing"
    const msg = `${other} still needs to sign the Phase 2 investigation for "${incidentTitle.slice(0, 60)}${incidentTitle.length > 60 ? "…" : ""}".`
    const actionUrl = `/admin/incidents/${incidentId}`

    const targetUserIds = users
      .map((udoc) => String((udoc as { id?: string }).id ?? ""))
      .filter(Boolean)

    if (targetUserIds.length === 0) return

    enqueueIncidentNotifications({
      facilityId,
      incidentId,
      type: "phase2-pending-signature",
      message: msg,
      actionUrl,
      actorName: "WAiK",
      priority: "normal",
      targetUserIds,
      push: null,
    })
  } catch (e) {
    console.error("[Phase2 notify] notifyAfterSignoff", e)
  }
}

export async function notifyReportingStaffInvestigationClosed(options: {
  facilityId: string
  incidentId: string
  incidentTitle: string
  staffId: string
}): Promise<void> {
  const { facilityId, incidentId, incidentTitle, staffId } = options
  if (!staffId) return
  const msg = `The Phase 2 investigation is locked and the incident is closed: "${incidentTitle.slice(0, 100)}${incidentTitle.length > 100 ? "…" : ""}".`
  const actionUrl = `/staff/incidents/${incidentId}`

  enqueueIncidentNotifications({
    facilityId,
    incidentId,
    type: "investigation-reporter-closed",
    message: msg,
    actionUrl,
    actorName: "WAiK",
    priority: "normal",
    targetUserIds: [staffId],
    push: null,
  })
}
