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
 * IR-3a — Weekly time-series trends.
 *
 * GET /api/admin/analytics/trends?weeks=8
 * Buckets are Monday 00:00 UTC → Sunday 23:59:59.999 UTC.
 * Cache: waik:analytics:trends:{facilityId}:{weeks} (TTL 300s)
 */

const TTL_SEC = 300
const cacheKey = (f: string, w: number) => `waik:analytics:trends:${f}:${w}`

interface TrendIncident {
  hasInjury?: boolean
  completenessAtSignoff?: number
  completenessScore?: number
  questionsAnswered?: number
  activeDataCollectionSeconds?: number
  phaseTransitionTimestamps?: { phase1Signed?: Date }
  createdAt?: Date
}

interface WeekBucket {
  start: Date
  end: Date
  incidentCount: number
  completenessSum: number
  completenessSamples: number
  questionsSum: number
  questionsSamples: number
  activeSecondsSum: number
  activeSecondsSamples: number
  injuryCount: number
}

function startOfMondayUTC(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = x.getUTCDay() // 0=Sun, 1=Mon, ...
  const diff = (day + 6) % 7 // days since Monday
  x.setUTCDate(x.getUTCDate() - diff)
  return x
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
    const weeksRaw = parseInt(url.searchParams.get("weeks") ?? "8", 10)
    const weeks = Number.isFinite(weeksRaw) ? Math.min(52, Math.max(1, weeksRaw)) : 8

    const key = cacheKey(facilityId, weeks)
    const cached = await getRedis().get(key)
    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached))
      } catch {
        // fall through
      }
    }

    const now = new Date()
    const currentMonday = startOfMondayUTC(now)
    const buckets: WeekBucket[] = []
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(currentMonday)
      start.setUTCDate(start.getUTCDate() - i * 7)
      const end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 7)
      end.setUTCMilliseconds(end.getUTCMilliseconds() - 1)
      buckets.push({
        start,
        end,
        incidentCount: 0,
        completenessSum: 0,
        completenessSamples: 0,
        questionsSum: 0,
        questionsSamples: 0,
        activeSecondsSum: 0,
        activeSecondsSamples: 0,
        injuryCount: 0,
      })
    }

    const windowStart = buckets[0]?.start
    const windowEnd = buckets[buckets.length - 1]?.end
    if (!windowStart || !windowEnd) {
      return NextResponse.json({ weeks: [] })
    }

    await connectMongo()
    // Filter by phase1Signed when present, otherwise fall back to createdAt.
    // We pull both windows generously and bucket in-memory.
    const incidents = await IncidentModel.find({
      facilityId,
      $or: [
        { "phaseTransitionTimestamps.phase1Signed": { $gte: windowStart, $lte: windowEnd } },
        {
          "phaseTransitionTimestamps.phase1Signed": { $exists: false },
          createdAt: { $gte: windowStart, $lte: windowEnd },
        },
      ],
    })
      .select(
        "hasInjury completenessAtSignoff completenessScore questionsAnswered activeDataCollectionSeconds phaseTransitionTimestamps createdAt",
      )
      .lean<TrendIncident[]>()

    for (const inc of incidents) {
      const ts = inc.phaseTransitionTimestamps?.phase1Signed
        ? new Date(inc.phaseTransitionTimestamps.phase1Signed)
        : inc.createdAt
          ? new Date(inc.createdAt)
          : null
      if (!ts) continue
      const bucket = buckets.find((b) => ts >= b.start && ts <= b.end)
      if (!bucket) continue

      bucket.incidentCount++
      const completeness =
        typeof inc.completenessAtSignoff === "number" && inc.completenessAtSignoff > 0
          ? inc.completenessAtSignoff
          : typeof inc.completenessScore === "number"
            ? inc.completenessScore
            : null
      if (completeness !== null) {
        bucket.completenessSum += completeness
        bucket.completenessSamples++
      }
      if (typeof inc.questionsAnswered === "number" && inc.questionsAnswered > 0) {
        bucket.questionsSum += inc.questionsAnswered
        bucket.questionsSamples++
      }
      if (
        typeof inc.activeDataCollectionSeconds === "number" &&
        inc.activeDataCollectionSeconds > 0
      ) {
        bucket.activeSecondsSum += inc.activeDataCollectionSeconds
        bucket.activeSecondsSamples++
      }
      if (inc.hasInjury) bucket.injuryCount++
    }

    const payload = {
      weeks: buckets.map((b) => ({
        weekStart: b.start.toISOString(),
        weekEnd: b.end.toISOString(),
        incidentCount: b.incidentCount,
        avgCompleteness:
          b.completenessSamples > 0 ? Math.round(b.completenessSum / b.completenessSamples) : 0,
        avgQuestionsNeeded:
          b.questionsSamples > 0
            ? Math.round((b.questionsSum / b.questionsSamples) * 10) / 10
            : 0,
        avgActiveSeconds:
          b.activeSecondsSamples > 0
            ? Math.round(b.activeSecondsSum / b.activeSecondsSamples)
            : 0,
        injuryCount: b.injuryCount,
      })),
    }

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
