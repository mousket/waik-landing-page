import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import IncidentModel from "@/backend/src/models/incident.model"
import ResidentModel from "@/backend/src/models/resident.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { getMdsCached, setMdsCache, buildMdsRecommendationsText } from "@/lib/mds-recommendations"
import { resolveResidentListFacility } from "@/lib/resident-api-facility"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorizedResponse()
  }
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 })
  }
  const { id: residentId } = await params

  try {
    const resolved = await resolveResidentListFacility(request, user)
    if (resolved instanceof NextResponse) {
      return resolved
    }
    const { facilityId } = resolved
    const cached = await getMdsCached(residentId)
    if (cached) {
      return NextResponse.json(cached)
    }

    await connectMongo()
    const r = await ResidentModel.findOne({ id: residentId, facilityId }).lean().exec()
    if (!r || Array.isArray(r)) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 })
    }
    const name = `${String((r as { firstName?: string }).firstName ?? "")} ${String(
      (r as { lastName?: string }).lastName ?? "",
    )}`.trim()

    const asRows = await AssessmentModel.find({ facilityId, residentId, status: "completed" })
      .sort({ conductedAt: -1 })
      .limit(2)
      .lean()
      .exec()
    const inc = await IncidentModel.find({ facilityId, residentId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean()
      .exec()

    const rec = await buildMdsRecommendationsText({
      residentName: name,
      lastAssessments: asRows as Array<Record<string, unknown>>,
      lastIncidents: inc as Array<Record<string, unknown>>,
    })
    const payload = { recommendations: rec, generatedAt: new Date().toISOString() }
    await setMdsCache(residentId, payload)
    return NextResponse.json(payload)
  } catch (e) {
    return authErrorResponse(e)
  }
}
