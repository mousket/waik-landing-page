import { NextResponse } from "next/server"
import { getRedis } from "@/lib/redis"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import {
  isEffectiveAdminFacilityError,
  resolveEffectiveAdminFacility,
} from "@/lib/effective-admin-facility"
import { requireAdminTier } from "@/lib/permissions"
import { rankQuestionEffectiveness } from "@/lib/analytics/question-effectiveness"

/**
 * IR-3c — Question effectiveness rankings.
 *
 * GET /api/admin/analytics/questions?incidentType=fall&days=90
 * Cache: waik:analytics:questions:{facilityId}:{type}:{days} (TTL 3600s)
 */

const TTL_SEC = 60 * 60
const cacheKey = (f: string, t: string, d: number) =>
  `waik:analytics:questions:${f}:${t}:${d}`

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)
    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    const url = new URL(request.url)
    const incidentType = (url.searchParams.get("incidentType") ?? "").trim()
    const daysRaw = parseInt(url.searchParams.get("days") ?? "90", 10)
    const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, daysRaw)) : 90

    const key = cacheKey(facilityId, incidentType || "all", days)
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
    const rankings = await rankQuestionEffectiveness(
      facilityId,
      incidentType || undefined,
      from,
      to,
    )

    const payload = {
      period: { from: from.toISOString(), to: to.toISOString(), days },
      incidentType: incidentType || null,
      rankings,
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
