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
 * IR-3a — Facility analytics overview.
 *
 * GET /api/admin/analytics/overview?days=30
 * Cache: waik:analytics:overview:{facilityId}:{days} (TTL 300s)
 */

const TTL_SEC = 300
const cacheKey = (f: string, d: number) => `waik:analytics:overview:${f}:${d}`

const OPEN_PHASES = new Set(["phase_1_in_progress", "phase_1_complete", "phase_2_in_progress"])

interface OverviewIncident {
  incidentType?: string
  phase?: string
  location?: string
  hasInjury?: boolean
  residentName?: string
  residentRoom?: string
  completenessAtSignoff?: number
  completenessScore?: number
  questionsAnswered?: number
  activeDataCollectionSeconds?: number
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
        // fall through to recompute
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
        "incidentType phase location hasInjury residentName residentRoom completenessAtSignoff completenessScore questionsAnswered activeDataCollectionSeconds",
      )
      .lean<OverviewIncident[]>()

    const byType: Record<string, number> = {}
    const byPhase: Record<string, number> = {}
    const locCount: Record<string, number> = {}
    const residentMap: Record<string, { name: string; room: string; count: number }> = {}

    let openInvestigations = 0
    let totalCompleteness = 0
    let completenessSamples = 0
    let totalQuestions = 0
    let questionsSamples = 0
    let totalActiveSeconds = 0
    let activeSamples = 0
    let injuryCount = 0
    const dist = { excellent: 0, good: 0, fair: 0, poor: 0 }

    for (const inc of incidents) {
      byType[inc.incidentType || "unknown"] = (byType[inc.incidentType || "unknown"] || 0) + 1
      byPhase[inc.phase || "unknown"] = (byPhase[inc.phase || "unknown"] || 0) + 1
      if (inc.phase && OPEN_PHASES.has(inc.phase)) openInvestigations++

      const loc = inc.location || "unknown"
      locCount[loc] = (locCount[loc] || 0) + 1

      if (inc.residentName) {
        const k = `${inc.residentName}::${inc.residentRoom || ""}`
        if (!residentMap[k]) {
          residentMap[k] = { name: inc.residentName, room: inc.residentRoom || "", count: 0 }
        }
        residentMap[k].count++
      }

      const completeness =
        typeof inc.completenessAtSignoff === "number" && inc.completenessAtSignoff > 0
          ? inc.completenessAtSignoff
          : typeof inc.completenessScore === "number"
            ? inc.completenessScore
            : null
      if (completeness !== null) {
        totalCompleteness += completeness
        completenessSamples++
        if (completeness >= 85) dist.excellent++
        else if (completeness >= 70) dist.good++
        else if (completeness >= 50) dist.fair++
        else dist.poor++
      }

      if (typeof inc.questionsAnswered === "number" && inc.questionsAnswered > 0) {
        totalQuestions += inc.questionsAnswered
        questionsSamples++
      }
      if (
        typeof inc.activeDataCollectionSeconds === "number" &&
        inc.activeDataCollectionSeconds > 0
      ) {
        totalActiveSeconds += inc.activeDataCollectionSeconds
        activeSamples++
      }
      if (inc.hasInjury) injuryCount++
    }

    const total = incidents.length
    const topLocations = Object.entries(locCount)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const topResidents = Object.values(residentMap)
      .map((r) => ({ name: r.name, room: r.room, count: r.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const payload = {
      period: { from: from.toISOString(), to: to.toISOString(), days },
      summary: {
        totalIncidents: total,
        openInvestigations,
        avgCompleteness: completenessSamples > 0 ? Math.round(totalCompleteness / completenessSamples) : 0,
        avgQuestionsToCompletion: questionsSamples > 0 ? Math.round((totalQuestions / questionsSamples) * 10) / 10 : 0,
        avgActiveSeconds: activeSamples > 0 ? Math.round(totalActiveSeconds / activeSamples) : 0,
        injuryRate: total > 0 ? Math.round((injuryCount / total) * 1000) / 10 : 0,
      },
      byType,
      byPhase,
      topLocations,
      topResidents,
      completenessDistribution: dist,
    }

    try {
      await getRedis().set(key, JSON.stringify(payload), "EX", TTL_SEC)
    } catch {
      // cache best-effort
    }
    return NextResponse.json(payload)
  } catch (e) {
    return authErrorResponse(e)
  }
}
