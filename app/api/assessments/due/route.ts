import { withAuth } from "@/lib/api-handler"

type DueAssessment = {
  id: string
  residentId: string
  residentRoom: string
  assessmentType: string
  nextDueAt: string | null
  daysUntilDue: number
}

export const GET = withAuth(async (_req, { currentUser }) => {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  let AssessmentModel: any = null
  try {
    const mod = await import("@/backend/src/models/assessment.model")
    AssessmentModel = (mod as any).AssessmentModel ?? (mod as any).default ?? null
  } catch {
    console.warn("[assessments/due] AssessmentModel not found — returning empty")
    return Response.json({ assessments: [], total: 0 })
  }

  const assessments = await AssessmentModel.find({
    facilityId: currentUser.facilityId,
    conductedById: currentUser.userId,
    nextDueAt: { $gte: now, $lte: sevenDaysFromNow },
  })
    .sort({ nextDueAt: 1 })
    .limit(10)
    .lean()
    .exec()

  const mapped: DueAssessment[] = (assessments ?? []).map((a: any) => {
    const nextDueAt = a?.nextDueAt ? new Date(a.nextDueAt) : null
    const daysUntilDue =
      nextDueAt && !Number.isNaN(nextDueAt.getTime())
        ? Math.ceil((nextDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0

    return {
      id: String(a?.id ?? ""),
      residentId: String(a?.residentId ?? ""),
      residentRoom: String(a?.residentRoom ?? ""),
      assessmentType: String(a?.assessmentType ?? ""),
      nextDueAt: nextDueAt ? nextDueAt.toISOString() : null,
      daysUntilDue,
    }
  })

  return Response.json({ assessments: mapped, total: mapped.length })
})

