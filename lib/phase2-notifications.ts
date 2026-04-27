import connectMongo from "@/backend/src/lib/mongodb"
import UserModel from "@/backend/src/models/user.model"
import { IncidentService } from "@/backend/src/services/incident.service"

function logServerPushBestEffort(targetUserId: string, title: string, body: string, url: string) {
  try {
    console.log("[Phase2 push] (best-effort, device push may be stub):", {
      to: targetUserId,
      title,
      body,
      url,
      t: new Date().toISOString(),
    })
  } catch (e) {
    console.error("[Phase2 push] log failed", e)
  }
}

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
      .lean()
      .exec()
    const msg = `All four investigation sections are complete for "${incidentTitle.slice(0, 80)}${incidentTitle.length > 80 ? "…" : ""}". You can proceed to sign-off.`
    const path = `/admin/incidents/${incidentId}`

    for (const udoc of users) {
      const uid = String((udoc as { id?: string }).id ?? "")
      if (!uid) continue
      try {
        await IncidentService.createNotification({
          incidentId,
          type: "phase2-all-sections-complete",
          message: msg,
          targetUserId: uid,
        })
        logServerPushBestEffort(uid, "Ready for sign-off", msg, path)
      } catch (e) {
        console.error("[Phase2 notify] createNotification (all sections)", e)
      }
    }
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
  /** The role the request just recorded. */
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
      .lean()
      .exec()

    const other = needAdmin ? "an administrator" : "the Director of Nursing"
    const msg = `${other} still needs to sign the Phase 2 investigation for "${incidentTitle.slice(0, 60)}${incidentTitle.length > 60 ? "…" : ""}".`
    const path = `/admin/incidents/${incidentId}`

    for (const udoc of users) {
      const uid = String((udoc as { id?: string }).id ?? "")
      if (!uid) continue
      try {
        await IncidentService.createNotification({
          incidentId,
          type: "phase2-pending-signature",
          message: msg,
          targetUserId: uid,
        })
        logServerPushBestEffort(uid, "Sign-off needed", msg, path)
      } catch (e) {
        console.error("[Phase2 notify] createNotification (signoff nudge)", e)
      }
    }
  } catch (e) {
    console.error("[Phase2 notify] notifyAfterSignoff", e)
  }
}

export async function notifyReportingStaffInvestigationClosed(options: {
  incidentId: string
  incidentTitle: string
  staffId: string
}): Promise<void> {
  const { incidentId, incidentTitle, staffId } = options
  if (!staffId) return
  const msg = `The Phase 2 investigation is locked and the incident is closed: "${incidentTitle.slice(0, 100)}${incidentTitle.length > 100 ? "…" : ""}".`
  try {
    await IncidentService.createNotification({
      incidentId,
      type: "investigation-reporter-closed",
      message: msg,
      targetUserId: staffId,
    })
    logServerPushBestEffort(staffId, "Investigation closed", msg, `/staff/incidents/${incidentId}`)
  } catch (e) {
    console.error("[Phase2 notify] notifyReportingStaffInvestigationClosed", e)
  }
}
