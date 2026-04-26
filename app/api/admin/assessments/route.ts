import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

type Row = {
  id: string
  residentId: string
  residentRoom: string
  assessmentType: string
  status: string
  conductedAt: string | null
  nextDueAt: string | null
  conductedByName: string
  completenessScore: number
}

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

  const assessments: Row[] = (rows ?? []).map((a) => {
    const conductedAt = a.conductedAt ? new Date(a.conductedAt) : null
    const nextDue = a.nextDueAt ? new Date(a.nextDueAt) : null
    return {
      id: String(a.id ?? ""),
      residentId: String(a.residentId ?? ""),
      residentRoom: String(a.residentRoom ?? ""),
      assessmentType: String(a.assessmentType ?? ""),
      status: String(a.status ?? ""),
      conductedAt: conductedAt && !Number.isNaN(conductedAt.getTime()) ? conductedAt.toISOString() : null,
      nextDueAt: nextDue && !Number.isNaN(nextDue.getTime()) ? nextDue.toISOString() : null,
      conductedByName: String(a.conductedByName ?? ""),
      completenessScore: Number(a.completenessScore ?? 0),
    }
  })

  return NextResponse.json({ assessments, total: assessments.length })
})
