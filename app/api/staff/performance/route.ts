import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { withAuth } from "@/lib/api-handler"
import getRedis from "@/lib/redis"

type StaffPerformance = {
  averageCompleteness30d: number
  averageCompleteness30dPrev: number
  currentStreak: number
  bestStreak: number
  totalReports30d: number
  generatedAt: string
}

function avgCompleteness(arr: Array<{ completenessAtSignoff?: number }>): number {
  if (!arr.length) return 0
  const sum = arr.reduce((s, i) => s + Number(i.completenessAtSignoff ?? 0), 0)
  return Math.round(sum / arr.length)
}

export const GET = withAuth(async (_request, { currentUser }) => {
  const { userId, facilityId } = currentUser
  const cacheKey = `waik:perf:${userId}:${facilityId}`
  const CACHE_TTL_SEC = 600

  try {
    const redis = getRedis()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(JSON.parse(cached) as StaffPerformance)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[perf] Redis cache read skipped:", msg)
  }

  await connectMongo()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const allSigned = await IncidentModel.find({
    facilityId,
    staffId: userId,
    completenessAtSignoff: { $gt: 0 },
  })
    .sort({ "phaseTransitionTimestamps.phase1Signed": -1 })
    .select("completenessAtSignoff phaseTransitionTimestamps.phase1Signed")
    .lean()
    .exec()

  const current30 = allSigned.filter((i: any) => {
    const signed = i.phaseTransitionTimestamps?.phase1Signed
    return signed && new Date(signed) >= thirtyDaysAgo
  })

  const prev30 = allSigned.filter((i: any) => {
    const signed = i.phaseTransitionTimestamps?.phase1Signed
    if (!signed) return false
    const d = new Date(signed)
    return d >= sixtyDaysAgo && d < thirtyDaysAgo
  })

  let currentStreak = 0
  for (const incident of allSigned as any[]) {
    if (Number(incident.completenessAtSignoff ?? 0) >= 85) {
      currentStreak++
    } else {
      break
    }
  }

  let bestStreak = 0
  let running = 0
  for (const incident of allSigned as any[]) {
    if (Number(incident.completenessAtSignoff ?? 0) >= 85) {
      running++
      bestStreak = Math.max(bestStreak, running)
    } else {
      running = 0
    }
  }

  const performance: StaffPerformance = {
    averageCompleteness30d: avgCompleteness(current30 as any),
    averageCompleteness30dPrev: avgCompleteness(prev30 as any),
    currentStreak,
    bestStreak,
    totalReports30d: current30.length,
    generatedAt: now.toISOString(),
  }

  try {
    const redis = getRedis()
    await redis.set(cacheKey, JSON.stringify(performance), "EX", CACHE_TTL_SEC)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[perf] Redis cache store skipped:", msg)
  }

  return NextResponse.json(performance)
})

