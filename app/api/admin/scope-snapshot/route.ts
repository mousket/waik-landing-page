import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

/**
 * Read-only: confirms `resolveEffectiveAdminFacility` and returns incident row counts
 * for the same scope as the dashboard (helps debug 403/400 + “no data” confusion).
 */
export const GET = withAdminAuth(async (request, { currentUser }) => {
  try {
    const resolved = await resolveEffectiveAdminFacility(request, currentUser)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId, organizationId } = resolved

    await connectMongo()

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [nonClosed, closedLast30, totalInFacility] = await Promise.all([
      IncidentModel.countDocuments({ facilityId, phase: { $ne: "closed" } }),
      IncidentModel.countDocuments({
        facilityId,
        phase: "closed",
        "phaseTransitionTimestamps.phase2Locked": { $gte: cutoff },
      }),
      IncidentModel.countDocuments({ facilityId }),
    ])

    return NextResponse.json({
      ok: true,
      scope: { facilityId, organizationId },
      counts: {
        openPipeline: nonClosed,
        closedLast30Days: closedLast30,
        allTimeInFacility: totalInFacility,
      },
    })
  } catch (e) {
    console.error("[api/admin/scope-snapshot GET]", e)
    return NextResponse.json({ error: "Failed to read scope snapshot" }, { status: 500 })
  }
})
