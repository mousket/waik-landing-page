import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import IncidentModel from "@/backend/src/models/incident.model"
import PilotFeedbackModel from "@/backend/src/models/feedback.model"
import UserModel from "@/backend/src/models/user.model"
import { requireWaikSuperAdmin } from "@/lib/waik-admin-api"
import { mapIncidentDocToSummary } from "@/lib/map-incident-summary"

const MS_DAY = 24 * 60 * 60 * 1000

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ facilityId: string }> },
) {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate
  const { facilityId } = await context.params

  await connectMongo()
  const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).lean().exec()
  if (!fac || Array.isArray(fac)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const now = new Date()
  const start7 = new Date(now.getTime() - 7 * MS_DAY)
  const start30 = new Date(now.getTime() - 30 * MS_DAY)
  const prev30Start = new Date(now.getTime() - 60 * MS_DAY)
  const prev30End = new Date(now.getTime() - 30 * MS_DAY)

  const dau7 = await UserModel.countDocuments({
    facilityId,
    isWaikSuperAdmin: { $ne: true },
    lastLoginAt: { $gte: start7, $lte: now },
  })

  const [inc30, incPrev] = await Promise.all([
    IncidentModel.find({ facilityId, createdAt: { $gte: start30, $lte: now } })
      .lean()
      .exec(),
    IncidentModel.find({ facilityId, createdAt: { $gte: prev30Start, $lt: prev30End } })
      .lean()
      .exec(),
  ])

  const n30 = inc30.length
  const avgPerDay = n30 / 30

  const inc30rows = inc30 as { completenessAtSignoff?: number; completenessScore?: number }[]
  const incPrevrows = incPrev as { completenessAtSignoff?: number; completenessScore?: number }[]

  function collectAvg(inc: { completenessAtSignoff?: number; completenessScore?: number }[]) {
    let s = 0
    let n = 0
    for (const d of inc) {
      const c = d.completenessAtSignoff ?? d.completenessScore
      if (c != null && c > 0) {
        s += c
        n++
      }
    }
    return n ? s / n : 0
  }
  const avgP1 = collectAvg(inc30rows)
  const avgP1Prev = collectAvg(incPrevrows)

  const p1OrMore = await IncidentModel.countDocuments({
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
  })
  const p2Close = await IncidentModel.countDocuments({ facilityId, phase: "closed" })
  const p2CloseRate = p1OrMore > 0 ? Math.round((p2Close / p1OrMore) * 1000) / 10 : 0

  const users = await UserModel.find({ facilityId, isWaikSuperAdmin: { $ne: true } })
    .sort({ lastName: 1, firstName: 1 })
    .lean()
    .limit(200)
    .exec()

  const recentRaw = await IncidentModel.find({ facilityId })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean()
    .exec()
  const recent = recentRaw
    .map((d) => mapIncidentDocToSummary(d as unknown as Record<string, unknown>))
    .filter(Boolean)

  const perStaff = await Promise.all(
    users.map(async (raw) => {
      const u = raw as unknown as Record<string, unknown>
      const uid = String(u.id)
      const sid = typeof u.clerkUserId === "string" ? u.clerkUserId : undefined
      if (!sid) {
        return {
          id: uid,
          name:
            `${String(u.firstName ?? "")} ${String(u.lastName ?? "")}`.trim() ||
            String(u.email),
          email: String(u.email),
          roleSlug: String(u.roleSlug),
          lastLoginAt: u.lastLoginAt
            ? new Date(u.lastLoginAt as string | Date).toISOString()
            : null,
          reportCount: 0,
          avgCompleteness: 0,
        }
      }
      const n = await IncidentModel.countDocuments({ facilityId, staffId: sid })
      const av = await IncidentModel.aggregate<{ a: number | null }>([
        { $match: { facilityId, staffId: sid } },
        { $group: { _id: null, a: { $avg: { $ifNull: ["$completenessAtSignoff", 0] } } } },
      ])
      return {
        id: uid,
        name:
          `${String(u.firstName ?? "")} ${String(u.lastName ?? "")}`.trim() ||
            String(u.email),
        email: String(u.email),
        roleSlug: String(u.roleSlug),
        lastLoginAt: u.lastLoginAt
          ? new Date(u.lastLoginAt as string | Date).toISOString()
          : null,
        reportCount: n,
        avgCompleteness: Math.round((av[0]?.a ?? 0) * 10) / 10,
      }
    }),
  )

  const fb = await PilotFeedbackModel.find({ facilityId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
    .exec()
  const totalFb = fb.length
  let sumScale1to2 = 0
  for (const x of fb) {
    const r = x as unknown as Record<string, unknown>
    sumScale1to2 += r.rating === 1 ? 2 : 1
  }
  const averageRating1to2 = totalFb ? Math.round((sumScale1to2 / totalFb) * 10) / 10 : 0
  const last5 = fb.slice(0, 5).map((raw) => {
    const x = raw as unknown as Record<string, unknown>
    return {
    rating: x.rating,
    comment: String(x.comment ?? ""),
    at: x.createdAt ? new Date(x.createdAt as string | Date).toISOString() : null,
  }
  })

  const facD = fac as unknown as Record<string, unknown>
  return NextResponse.json({
    facility: {
      id: String(facD.id),
      name: String(facD.name),
      type: facD.type,
      state: facD.state,
      plan: facD.plan,
      onboardingDate: facD.onboardingDate
        ? new Date(facD.onboardingDate as string | Date).toISOString()
        : null,
    },
    metrics: {
      dailyActiveUsersThisWeek: dau7,
      averageIncidentsPerDay30d: Math.round(avgPerDay * 100) / 100,
      averagePhase1Completeness30d: Math.round(avgP1 * 10) / 10,
      averagePhase1CompletenessPrev30d: Math.round(avgP1Prev * 10) / 10,
      phase2CloseRate: p2CloseRate,
    },
    staff: perStaff,
    recentIncidents: recent,
    feedback: {
      averageRating1to2,
      totalResponses: totalFb,
      recent5: last5,
    },
  })
}
