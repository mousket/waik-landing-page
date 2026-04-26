import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import IncidentModel from "@/backend/src/models/incident.model"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import getRedis from "@/lib/redis"

const CACHE_TTL_SEC = 300

function startedAtExpr() {
  return { $ifNull: ["$startedAt", "$createdAt"] } as const
}

export const GET = withAdminAuth(async (request, { currentUser }) => {
  const resolved = await resolveEffectiveAdminFacility(request, currentUser)
  if (isEffectiveAdminFacilityError(resolved)) return resolved.error
  const { facilityId } = resolved

  const cacheKey = `waik:stats:${facilityId}`

  try {
    const redis = getRedis()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(JSON.parse(cached) as DashboardStats)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[dashboard-stats] Redis cache read skipped:", msg)
  }

  await connectMongo()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const matchStarted = (from: Date, to?: Date) => ({
    $match: {
      facilityId,
      $expr: {
        ...(to
          ? {
              $and: [{ $gte: [startedAtExpr(), from] }, { $lt: [startedAtExpr(), to] }],
            }
          : { $gte: [startedAtExpr(), from] }),
      },
    },
  })

  const injuryExpr = {
    $or: [{ $eq: ["$hasInjury", true] }, { $eq: ["$redFlags.hasInjury", true] }],
  }

  const [current30, prev30, closedCurrent, closedPrev, assessmentRows, assessmentCount] = await Promise.all([
    IncidentModel.aggregate<{
      total: number
      avgCompleteness: number | null
      injuryCount: number
    }>([
      matchStarted(thirtyDaysAgo),
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgCompleteness: { $avg: "$completenessAtSignoff" },
          injuryCount: { $sum: { $cond: [injuryExpr, 1, 0] } },
        },
      },
    ]),
    IncidentModel.aggregate<{ total: number; avgCompleteness: number | null }>([
      matchStarted(sixtyDaysAgo, thirtyDaysAgo),
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgCompleteness: { $avg: "$completenessAtSignoff" },
        },
      },
    ]),
    IncidentModel.aggregate<{ avgDays: number | null }>([
      {
        $match: {
          facilityId,
          phase: "closed",
          "phaseTransitionTimestamps.phase2Locked": { $gte: thirtyDaysAgo },
        },
      },
      {
        $project: {
          daysToClose: {
            $cond: [
              {
                $and: [
                  { $ne: ["$phaseTransitionTimestamps.phase2Locked", null] },
                  { $ne: ["$phaseTransitionTimestamps.phase1Signed", null] },
                ],
              },
              {
                $divide: [
                  {
                    $subtract: [
                      "$phaseTransitionTimestamps.phase2Locked",
                      "$phaseTransitionTimestamps.phase1Signed",
                    ],
                  },
                  86400000,
                ],
              },
              null,
            ],
          },
        },
      },
      { $match: { daysToClose: { $ne: null } } },
      { $group: { _id: null, avgDays: { $avg: "$daysToClose" } } },
    ]),
    IncidentModel.aggregate<{ avgDays: number | null }>([
      {
        $match: {
          facilityId,
          phase: "closed",
          "phaseTransitionTimestamps.phase2Locked": { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        },
      },
      {
        $project: {
          daysToClose: {
            $cond: [
              {
                $and: [
                  { $ne: ["$phaseTransitionTimestamps.phase2Locked", null] },
                  { $ne: ["$phaseTransitionTimestamps.phase1Signed", null] },
                ],
              },
              {
                $divide: [
                  {
                    $subtract: [
                      "$phaseTransitionTimestamps.phase2Locked",
                      "$phaseTransitionTimestamps.phase1Signed",
                    ],
                  },
                  86400000,
                ],
              },
              null,
            ],
          },
        },
      },
      { $match: { daysToClose: { $ne: null } } },
      { $group: { _id: null, avgDays: { $avg: "$daysToClose" } } },
    ]),
    AssessmentModel.find({
      facilityId,
      nextDueAt: { $gte: now, $lte: sevenDaysFromNow },
      status: { $in: ["scheduled", "in_progress", "overdue"] },
    })
      .sort({ nextDueAt: 1 })
      .limit(8)
      .lean()
      .exec(),
    AssessmentModel.countDocuments({
      facilityId,
      nextDueAt: { $gte: now, $lte: sevenDaysFromNow },
      status: { $in: ["scheduled", "in_progress", "overdue"] },
    }).exec(),
  ])

  const c = current30[0] ?? { total: 0, avgCompleteness: 0, injuryCount: 0 }
  const p = prev30[0] ?? { total: 0, avgCompleteness: 0 }
  const cc = closedCurrent[0] ?? { avgDays: 0 }
  const cp = closedPrev[0] ?? { avgDays: 0 }

  const total = c.total
  const stats: DashboardStats = {
    totalIncidents30d: total,
    avgCompleteness30d: Math.round(Number(c.avgCompleteness ?? 0)),
    avgDaysToClose30d: Math.round(Number(cc.avgDays ?? 0) * 10) / 10,
    injuryFlagPercent30d: total > 0 ? Math.round((c.injuryCount / total) * 100) : 0,
    totalIncidentsPrev30d: p.total,
    avgCompletenessPrev30d: Math.round(Number(p.avgCompleteness ?? 0)),
    avgDaysToClosePrev30d: Math.round(Number(cp.avgDays ?? 0) * 10) / 10,
    upcomingAssessments7d: assessmentCount,
    upcomingAssessmentItems: assessmentRows.map((row) => ({
      residentRoom: String(row.residentRoom ?? ""),
      assessmentType: String(row.assessmentType ?? ""),
      nextDueAt: row.nextDueAt instanceof Date ? row.nextDueAt.toISOString() : String(row.nextDueAt ?? ""),
    })),
    generatedAt: now.toISOString(),
  }

  try {
    const redis = getRedis()
    await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL_SEC)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[dashboard-stats] Redis cache write skipped:", msg)
  }

  return NextResponse.json(stats)
})
