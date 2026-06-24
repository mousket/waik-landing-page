import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import { displayAssessmentType } from "@/lib/assessments/presentation"
import { persistOneNotification } from "@/lib/notification-service"

export type AssessmentReminderRunResult = {
  scanned: number
  sent: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function sameUtcDay(a: Date, b: Date): boolean {
  return startOfUtcDay(a).getTime() === startOfUtcDay(b).getTime()
}

/**
 * Daily cron: notify assigned staff when an assessment is due in ~3 days.
 */
export async function processAssessmentDueReminders(now = new Date()): Promise<AssessmentReminderRunResult> {
  await connectMongo()
  const out: AssessmentReminderRunResult = { scanned: 0, sent: 0 }

  const today = startOfUtcDay(now)
  const windowStart = new Date(today.getTime() + 3 * MS_PER_DAY)
  const windowEnd = new Date(today.getTime() + 4 * MS_PER_DAY)

  const rows = await AssessmentModel.find({
    status: "completed",
    nextDueAt: { $gte: windowStart, $lt: windowEnd },
    conductedById: { $exists: true, $ne: "" },
  })
    .select([
      "id",
      "facilityId",
      "residentId",
      "residentName",
      "residentRoom",
      "assessmentType",
      "conductedById",
      "nextDueAt",
      "dueSoonReminderFor",
    ])
    .lean()
    .exec()

  for (const raw of rows) {
    out.scanned++
    const a = raw as unknown as {
      id: string
      facilityId?: string
      residentId?: string
      residentName?: string
      residentRoom?: string
      assessmentType?: string
      conductedById?: string
      nextDueAt?: Date
      dueSoonReminderFor?: Date
    }

    if (!a.facilityId || !a.conductedById || !a.nextDueAt) continue
    const nextDue = new Date(a.nextDueAt)
    if (Number.isNaN(nextDue.getTime())) continue

    if (a.dueSoonReminderFor) {
      const sentFor = new Date(a.dueSoonReminderFor)
      if (!Number.isNaN(sentFor.getTime()) && sameUtcDay(sentFor, nextDue)) continue
    }

    const room = (a.residentRoom ?? "").trim() || "—"
    const resident = (a.residentName ?? "").trim()
    const typeLabel = displayAssessmentType(String(a.assessmentType ?? "assessment"))
    const message =
      resident.length > 0
        ? `Assessment due soon for ${resident} (Room ${room}) — ${typeLabel}`
        : `Assessment due soon — Room ${room}, ${typeLabel}`

    await persistOneNotification({
      incidentId: a.id,
      type: "assessment-due-soon",
      message,
      targetUserId: a.conductedById,
      facilityId: a.facilityId,
      actionUrl: "/staff/assessments",
      category: "assessment",
      priority: "normal",
      actorName: "WAiK",
    })

    await AssessmentModel.updateOne(
      { id: a.id },
      { $set: { dueSoonReminderFor: nextDue, updatedAt: now } },
    ).exec()

    out.sent++
  }

  return out
}
