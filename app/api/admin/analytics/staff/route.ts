import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { getRedis } from "@/lib/redis"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import {
  isEffectiveAdminFacilityError,
  resolveEffectiveAdminFacility,
} from "@/lib/effective-admin-facility"
import { requireAdminTier } from "@/lib/permissions"

/**
 * IR-3a — Per-staff performance.
 *
 * GET /api/admin/analytics/staff?days=30
 * Cache: waik:analytics:staff:{facilityId}:{days} (TTL 300s)
 */

const TTL_SEC = 300
const cacheKey = (f: string, d: number) => `waik:analytics:staff:${f}:${d}`

interface StaffIncident {
  staffId?: string
  staffName?: string
  completenessAtSignoff?: number
  completenessScore?: number
  questionsAnswered?: number
  activeDataCollectionSeconds?: number
  createdAt?: Date
  phaseTransitionTimestamps?: { phase1Signed?: Date }
}

interface PerStaff {
  staffId: string
  staffName: string
  totalReports: number
  avgCompleteness: number
  avgQuestionsNeeded: number
  avgActiveSeconds: number
  currentStreak: number
  trend: "improving" | "stable" | "declining"
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  const sum = nums.reduce((a, b) => a + b, 0)
  return sum / nums.length
}

function computeStreak(scores: number[]): number {
  // Number of consecutive most-recent reports with completeness >= 70.
  // `scores` is ordered newest-first.
  let s = 0
  for (const score of scores) {
    if (score >= 70) s++
    else break
  }
  return s
}

function computeTrend(scores: number[]): "improving" | "stable" | "declining" {
  // `scores` ordered newest-first. Compare last 5 (newest) to previous 5.
  if (scores.length < 6) return "stable"
  const recent = avg(scores.slice(0, 5))
  const previous = avg(scores.slice(5, 10))
  const diff = recent - previous
  if (diff > 5) return "improving"
  if (diff < -5) return "declining"
  return "stable"
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)
    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    const url = new URL(request.url)
    const daysRaw = parseInt(url.searchParams.get("days") ?? "30", 10)
    const days = Number.isFinite(daysRaw) ? Math.min(90, Math.max(1, daysRaw)) : 30

    const key = cacheKey(facilityId, days)
    const cached = await getRedis().get(key)
    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached))
      } catch {
        // fall through
      }
    }

    const to = new Date()
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)

    await connectMongo()
    const incidents = await IncidentModel.find({
      facilityId,
      createdAt: { $gte: from, $lte: to },
    })
      .select(
        "staffId staffName completenessAtSignoff completenessScore questionsAnswered activeDataCollectionSeconds createdAt phaseTransitionTimestamps",
      )
      .sort({ createdAt: -1 })
      .lean<StaffIncident[]>()

    type Bucket = {
      staffId: string
      staffName: string
      totalReports: number
      completenessSeries: number[] // newest-first
      questions: number[]
      activeSeconds: number[]
    }
    const buckets = new Map<string, Bucket>()

    for (const inc of incidents) {
      if (!inc.staffId) continue
      let b = buckets.get(inc.staffId)
      if (!b) {
        b = {
          staffId: inc.staffId,
          staffName: inc.staffName || "Unknown",
          totalReports: 0,
          completenessSeries: [],
          questions: [],
          activeSeconds: [],
        }
        buckets.set(inc.staffId, b)
      }
      b.totalReports++
      const completeness =
        typeof inc.completenessAtSignoff === "number" && inc.completenessAtSignoff > 0
          ? inc.completenessAtSignoff
          : typeof inc.completenessScore === "number"
            ? inc.completenessScore
            : null
      if (completeness !== null) b.completenessSeries.push(completeness)
      if (typeof inc.questionsAnswered === "number" && inc.questionsAnswered > 0) {
        b.questions.push(inc.questionsAnswered)
      }
      if (
        typeof inc.activeDataCollectionSeconds === "number" &&
        inc.activeDataCollectionSeconds > 0
      ) {
        b.activeSeconds.push(inc.activeDataCollectionSeconds)
      }
    }

    let facilityCompletenessSum = 0
    let facilityCompletenessSamples = 0

    const staff: PerStaff[] = []
    for (const b of buckets.values()) {
      const avgCompleteness =
        b.completenessSeries.length > 0 ? Math.round(avg(b.completenessSeries)) : 0
      const avgQuestionsNeeded =
        b.questions.length > 0 ? Math.round(avg(b.questions) * 10) / 10 : 0
      const avgActiveSeconds = b.activeSeconds.length > 0 ? Math.round(avg(b.activeSeconds)) : 0

      if (b.completenessSeries.length > 0) {
        facilityCompletenessSum += avgCompleteness
        facilityCompletenessSamples++
      }

      staff.push({
        staffId: b.staffId,
        staffName: b.staffName,
        totalReports: b.totalReports,
        avgCompleteness,
        avgQuestionsNeeded,
        avgActiveSeconds,
        currentStreak: computeStreak(b.completenessSeries),
        trend: computeTrend(b.completenessSeries),
      })
    }

    staff.sort((a, b) => b.totalReports - a.totalReports)

    const facilityAverage =
      facilityCompletenessSamples > 0
        ? Math.round(facilityCompletenessSum / facilityCompletenessSamples)
        : 0

    const payload = { staff, facilityAverage }
    try {
      await getRedis().set(key, JSON.stringify(payload), "EX", TTL_SEC)
    } catch {
      // best-effort
    }
    return NextResponse.json(payload)
  } catch (e) {
    return authErrorResponse(e)
  }
}
