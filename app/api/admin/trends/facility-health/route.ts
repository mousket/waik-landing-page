import { NextResponse } from "next/server"
import { computeTrendsFacilityHealthPair } from "@/lib/admin/trends-facility-health-metrics"
import { loadTrendsIncidentPool } from "@/lib/admin/load-trends-incident-pool"
import { parseTrendsRangeParam } from "@/lib/admin/trends-range"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import type { TrendsFacilityHealthResponse } from "@/lib/types/trends-facility-health"

export const GET = withAdminAuth(async (request, { currentUser }) => {
  const resolved = await resolveEffectiveAdminFacility(request, currentUser)
  if (isEffectiveAdminFacilityError(resolved)) return resolved.error

  const range = parseTrendsRangeParam(new URL(request.url).searchParams.get("range"))
  const pool = await loadTrendsIncidentPool(resolved.facilityId, range)
  const { current, previous } = pool
  const { current: c, previous: p } = computeTrendsFacilityHealthPair(pool.incidents, current, previous)

  const body: TrendsFacilityHealthResponse = {
    range,
    generatedAt: new Date(pool.nowMs).toISOString(),
    current: c,
    previous: p,
  }
  return NextResponse.json(body)
})
