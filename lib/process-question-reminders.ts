import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import {
  fetchFacilityAdminRecipients,
  persistOneNotification,
} from "@/lib/notification-service"
import { dualPushTier2Escalation, dualPushTier2QuestionReminder } from "@/lib/push-service"

export type QuestionReminderRunResult = {
  scanned: number
  reminders2h: number
  reminders4h: number
  escalations: number
}

/**
 * Hourly cron: Tier 2 “answer later” — remind staff at ~2h and ~4h; escalate to admins at 8h+.
 */
export async function processDeferredQuestionReminders(now = new Date()): Promise<QuestionReminderRunResult> {
  await connectMongo()
  const out: QuestionReminderRunResult = {
    scanned: 0,
    reminders2h: 0,
    reminders4h: 0,
    escalations: 0,
  }

  const incidents = await IncidentModel.find({
    phase: "phase_1_in_progress",
    tier2DeferredAt: { $ne: null },
    questionsDeferred: { $gt: 0 },
  })
    .select([
      "id",
      "facilityId",
      "staffId",
      "residentName",
      "residentRoom",
      "questionsDeferred",
      "tier2DeferredAt",
      "tier2Reminder2hSentAt",
      "tier2Reminder4hSentAt",
      "tier2EscalationSentAt",
    ])
    .lean()
    .exec()

  for (const raw of incidents) {
    out.scanned++
    const inc = raw as {
      id: string
      facilityId?: string
      staffId?: string
      residentName?: string
      residentRoom?: string
      questionsDeferred?: number
      tier2DeferredAt?: Date
      tier2Reminder2hSentAt?: Date | null
      tier2Reminder4hSentAt?: Date | null
      tier2EscalationSentAt?: Date | null
    }

    if (!inc.facilityId || !inc.staffId) continue
    const defMs = inc.tier2DeferredAt ? new Date(inc.tier2DeferredAt).getTime() : 0
    if (!defMs) continue

    const hours = (now.getTime() - defMs) / (60 * 60 * 1000)
    const unanswered = Math.max(1, Number(inc.questionsDeferred) || 1)
    const staffAction = `/staff/incidents/${inc.id}`

    const pushStaff = dualPushTier2QuestionReminder({
      incidentId: inc.id,
      roomNumber: inc.residentRoom ?? "",
      residentName: inc.residentName ?? "",
      unansweredCount: unanswered,
    })

    if (hours >= 8 && !inc.tier2EscalationSentAt) {
      const admins = await fetchFacilityAdminRecipients(inc.facilityId)
      const pushEsc = dualPushTier2Escalation({
        incidentId: inc.id,
        roomNumber: inc.residentRoom ?? "",
        residentName: inc.residentName ?? "",
        hoursElapsed: hours,
      })
      const room = inc.residentRoom?.trim() || "—"
      for (const uid of admins) {
        await persistOneNotification({
          incidentId: inc.id,
          facilityId: inc.facilityId,
          type: "follow-up-required",
          message: `Unanswered report questions — ~${Math.round(hours)}h since deferral (Room ${room}).`,
          targetUserId: uid,
          actionUrl: `/admin/incidents/${inc.id}`,
          priority: "normal",
          deliverPush: true,
          push: pushEsc,
        })
      }
      await IncidentModel.updateOne(
        { id: inc.id, facilityId: inc.facilityId },
        { $set: { tier2EscalationSentAt: now, updatedAt: now } },
      ).exec()
      out.escalations++
    } else if (hours >= 4 && !inc.tier2Reminder4hSentAt) {
      await persistOneNotification({
        incidentId: inc.id,
        facilityId: inc.facilityId,
        type: "follow-up-required",
        message: `Second reminder: ${unanswered} question(s) still need answers (${roomDisplay(inc.residentRoom)}).`,
        targetUserId: inc.staffId,
        actionUrl: staffAction,
        priority: "normal",
        deliverPush: true,
        push: pushStaff,
      })
      await IncidentModel.updateOne(
        { id: inc.id, facilityId: inc.facilityId },
        { $set: { tier2Reminder4hSentAt: now, updatedAt: now } },
      ).exec()
      out.reminders4h++
    } else if (hours >= 2 && !inc.tier2Reminder2hSentAt) {
      await persistOneNotification({
        incidentId: inc.id,
        facilityId: inc.facilityId,
        type: "follow-up-required",
        message: `You have ${unanswered} unanswered incident question(s). Tap to continue your report.`,
        targetUserId: inc.staffId,
        actionUrl: staffAction,
        priority: "normal",
        deliverPush: true,
        push: pushStaff,
      })
      await IncidentModel.updateOne(
        { id: inc.id, facilityId: inc.facilityId },
        { $set: { tier2Reminder2hSentAt: now, updatedAt: now } },
      ).exec()
      out.reminders2h++
    }
  }

  return out
}

function roomDisplay(room?: string): string {
  const r = room?.trim()
  return r && r.length > 0 ? `Room ${r}` : "this resident"
}
