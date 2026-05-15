import { NextResponse } from "next/server"
import { loadTrendsIncidentPool } from "@/lib/admin/load-trends-incident-pool"
import { computeTrendsInterventionEffectivenessResponse } from "@/lib/admin/trends-intervention-effectiveness-metrics"
import { parseTrendsRangeParam } from "@/lib/admin/trends-range"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

export const GET = withAdminAuth(async (request, { currentUser }) => {
  const resolved = await resolveEffectiveAdminFacility(request, currentUser)
  if (isEffectiveAdminFacilityError(resolved)) return resolved.error

  const range = parseTrendsRangeParam(new URL(request.url).searchParams.get("range"))
  const pool = await loadTrendsIncidentPool(resolved.facilityId, range)
  const body = computeTrendsInterventionEffectivenessResponse(
    pool.incidents,
    pool.current,
    pool.previous,
    range,
    pool.nowMs,
  )
  return NextResponse.json(body)
})
