import { NextResponse } from "next/server"

import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import { mapAssessmentDocToSummary } from "@/lib/assessments/presentation"
import { withAuth } from "@/lib/api-handler"
import { userCanUseStaffOperationalSurface } from "@/lib/waik-roles"

export const GET = withAuth(async (_request, { currentUser }) => {
  if (!userCanUseStaffOperationalSurface(currentUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!currentUser.facilityId) {
    return NextResponse.json({ error: "No facility assigned" }, { status: 400 })
  }

  await connectMongo()

  const rows = await AssessmentModel.find({ facilityId: currentUser.facilityId })
    .sort({ nextDueAt: 1, conductedAt: -1 })
    .limit(200)
    .lean()
    .exec()

  const assessments = (rows ?? []).map((assessment) => mapAssessmentDocToSummary(assessment as Record<string, unknown>))

  return NextResponse.json({ assessments, total: assessments.length })
})
