import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { buildDailyCommandTodayPayload } from "@/lib/admin/build-daily-command-today"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { mapIncidentDocToSummary } from "@/lib/map-incident-summary"
import getRedis from "@/lib/redis"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import type { IncidentPhase } from "@/lib/types/incident-summary"

export const dynamic = "force-dynamic"

const OPEN_PIPELINE_PHASES: IncidentPhase[] = ["phase_1_in_progress", "phase_1_complete", "phase_2_in_progress"]

/**
 * GET /api/admin/daily-command/today
 * Compact Daily Command envelope (A1–A7 aggregates) — same incident scope as the dashboard list
 * (`/api/incidents?phase=phase_1_in_progress,phase_1_complete,phase_2_in_progress`).
 */
export const GET = withAdminAuth(async (request, { currentUser: user }) => {
  const resolved = await resolveEffectiveAdminFacility(request, user)
  if (isEffectiveAdminFacilityError(resolved)) return resolved.error
  const { facilityId } = resolved

  let stats: DashboardStats | null = null
  try {
    const redis = getRedis()
    const cached = await redis.get(`waik:stats:${facilityId}`)
    if (cached) {
      stats = JSON.parse(cached) as DashboardStats
    }
  } catch {
    stats = null
  }

  await connectMongo()
  const raw = await IncidentModel.find({
    facilityId,
    phase: { $in: OPEN_PIPELINE_PHASES },
  })
    .sort({ updatedAt: -1 })
    .lean()
    .exec()

  const incidents = raw.map((doc) => mapIncidentDocToSummary(doc as unknown as Record<string, unknown>))

  const linkSp = new URL(request.url).searchParams
  const canAccessPhase2 = Boolean(user.canAccessPhase2 || user.isWaikSuperAdmin)

  const payload = buildDailyCommandTodayPayload({
    facilityId,
    incidents,
    stats,
    statsLoading: false,
    canAccessPhase2,
    searchParams: linkSp,
  })

  return NextResponse.json(payload, { status: 200 })
})
