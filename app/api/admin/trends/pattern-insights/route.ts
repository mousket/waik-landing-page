import { NextResponse } from "next/server"
import { loadTrendsIncidentPool } from "@/lib/admin/load-trends-incident-pool"
import { computeTrendsPatternInsightsResponse } from "@/lib/admin/trends-pattern-insights-metrics"
import { parseTrendsRangeParam } from "@/lib/admin/trends-range"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

export const GET = withAdminAuth(async (request, { currentUser }) => {
  const resolved = await resolveEffectiveAdminFacility(request, currentUser)
  if (isEffectiveAdminFacilityError(resolved)) return resolved.error

  const range = parseTrendsRangeParam(new URL(request.url).searchParams.get("range"))
  const pool = await loadTrendsIncidentPool(resolved.facilityId, range)
  const body = computeTrendsPatternInsightsResponse(pool.incidents, pool.current, range, pool.nowMs)
  return NextResponse.json(body)
})
