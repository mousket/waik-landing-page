import { withAuth } from "@/lib/api-handler"
import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import ResidentModel from "@/backend/src/models/resident.model"
import { authErrorResponse } from "@/lib/auth"

export const dynamic = "force-dynamic"

type DueAssessment = {
  id: string
  residentId: string
  residentName: string
  residentRoom: string
  assessmentType: string
  nextDueAt: string | null
  daysUntilDue: number
}

function displayResidentName(r: {
  preferredName?: string
  firstName?: string
  lastName?: string
}): string {
  const p = (r.preferredName || "").trim()
  if (p) return p
  const fn = (r.firstName || "").trim()
  const ln = (r.lastName || "").trim()
  const full = `${fn} ${ln}`.trim()
  return full || "Resident"
}

export const GET = withAuth(async (req, { currentUser }) => {
  try {
    const { searchParams } = new URL(req.url)
    const daysRaw = searchParams.get("days")
    const days = Math.min(90, Math.max(1, daysRaw == null || daysRaw === "" ? 7 : Number(daysRaw) || 7))
    const facilityQ = searchParams.get("facilityId")
    if (!currentUser.isWaikSuperAdmin && facilityQ && facilityQ !== currentUser.facilityId) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    const facilityId = (currentUser.isWaikSuperAdmin ? (facilityQ?.trim() || currentUser.facilityId) : currentUser.facilityId) ?? ""

    if (!facilityId) {
      return Response.json({ error: "facilityId required" }, { status: 400 })
    }

    await connectMongo()
    const now = new Date()
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const rows = await AssessmentModel.find({
      facilityId,
      nextDueAt: { $gte: now, $lte: end },
    })
      .sort({ nextDueAt: 1 })
      .limit(50)
      .lean()
      .exec()

    const mapped: DueAssessment[] = (rows ?? []).map((a: any) => {
      const nextDueAt = a?.nextDueAt ? new Date(a.nextDueAt) : null
      const daysUntilDue =
        nextDueAt && !Number.isNaN(nextDueAt.getTime())
          ? Math.ceil((nextDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0
      const fromDoc = String(a?.residentName ?? "").trim()
      return {
        id: String(a?.id ?? ""),
        residentId: String(a?.residentId ?? ""),
        residentName: fromDoc,
        residentRoom: String(a?.residentRoom ?? ""),
        assessmentType: String(a?.assessmentType ?? ""),
        nextDueAt: nextDueAt ? nextDueAt.toISOString() : null,
        daysUntilDue,
      }
    })

    const idsNeedingName = [
      ...new Set(
        mapped.filter((m) => !m.residentName && m.residentId).map((m) => m.residentId),
      ),
    ]
    if (idsNeedingName.length > 0) {
      const resDocs = (await ResidentModel.find({ id: { $in: idsNeedingName } })
        .select("id firstName lastName preferredName")
        .lean()
        .exec()) as Array<{
        id?: string
        firstName?: string
        lastName?: string
        preferredName?: string
      }>
      const byId = new Map<string, string>()
      for (const r of resDocs ?? []) {
        const id = String(r?.id ?? "")
        if (!id) continue
        byId.set(id, displayResidentName(r))
      }
      for (const m of mapped) {
        if (!m.residentName && m.residentId) {
          m.residentName = byId.get(m.residentId) ?? "Resident"
        }
      }
    }
    for (const m of mapped) {
      if (!m.residentName) m.residentName = "Resident"
    }

    return Response.json({ assessments: mapped, total: mapped.length, days, facilityId })
  } catch (e) {
    return authErrorResponse(e)
  }
})
