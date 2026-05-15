import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import { mapAssessmentDocToSummary } from "@/lib/assessments/presentation"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

export const GET = withAdminAuth(async (request, { currentUser: _u }) => {
  const resolved = await resolveEffectiveAdminFacility(request, _u)
  if (isEffectiveAdminFacilityError(resolved)) return resolved.error
  const { facilityId } = resolved

  await connectMongo()

  const rows = await AssessmentModel.find({ facilityId })
    .sort({ nextDueAt: 1, conductedAt: -1 })
    .limit(200)
    .lean()
    .exec()

  const assessments = (rows ?? []).map((assessment) => mapAssessmentDocToSummary(assessment as Record<string, unknown>))

  return NextResponse.json({ assessments, total: assessments.length })
})
