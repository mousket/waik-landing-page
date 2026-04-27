import { NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { getCompletenessTrend8Weeks } from "@/lib/admin-community-intelligence"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(async (request, { currentUser: user }) => {
  const r = await resolveEffectiveAdminFacility(request, user)
  if (isEffectiveAdminFacilityError(r)) {
    return r.error
  }
  const { facilityId } = r
  try {
    const p = await getCompletenessTrend8Weeks(facilityId)
    return NextResponse.json(p, { status: 200 })
  } catch (e) {
    console.error("[admin intelligence completeness-trend]", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
})
