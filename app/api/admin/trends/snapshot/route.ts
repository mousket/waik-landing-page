import { NextResponse } from "next/server"
import { buildTrendsSnapshotPayload } from "@/lib/admin/build-trends-snapshot"
import { loadTrendsIncidentPool } from "@/lib/admin/load-trends-incident-pool"
import { parseTrendsRangeParam } from "@/lib/admin/trends-range"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import type { TrendsSnapshotPayload } from "@/lib/types/trends-snapshot"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/trends/snapshot?range=7d|30d|90d
 * Single compact envelope for Executive View (E2–E8, S1) — no raw incident list.
 */
export const GET = withAdminAuth(async (request, { currentUser }) => {
  const resolved = await resolveEffectiveAdminFacility(request, currentUser)
  if (isEffectiveAdminFacilityError(resolved)) return resolved.error
  const { facilityId } = resolved

  const range = parseTrendsRangeParam(new URL(request.url).searchParams.get("range"))
  const pool = await loadTrendsIncidentPool(facilityId, range)
  const body: TrendsSnapshotPayload = buildTrendsSnapshotPayload(facilityId, pool)
  return NextResponse.json(body)
})
