import IncidentModel from "@/backend/src/models/incident.model"
import { withAuth } from "@/lib/api-handler"

export const GET = withAuth(async (_req, { currentUser }) => {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  let AssessmentModel: any = null
  try {
    const mod = await import("@/backend/src/models/assessment.model")
    AssessmentModel = (mod as any).AssessmentModel ?? (mod as any).default ?? null
  } catch {
    console.warn("[badge-counts] AssessmentModel not found — returning 0")
    AssessmentModel = null
  }

  const [pendingCount, assessmentCount] = await Promise.all([
    IncidentModel.countDocuments({
      facilityId: currentUser.facilityId,
      staffId: currentUser.userId,
      phase: "phase_1_in_progress",
      completenessScore: { $lt: 100 },
    }),
    AssessmentModel
      ? AssessmentModel.countDocuments({
          facilityId: currentUser.facilityId,
          conductedById: currentUser.userId,
          nextDueAt: { $gte: now, $lte: sevenDaysFromNow },
        })
      : Promise.resolve(0),
  ])

  return Response.json({
    pendingQuestions: pendingCount,
    dueAssessments: assessmentCount,
  })
})

