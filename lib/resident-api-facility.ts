import { NextResponse } from "next/server"
import type { CurrentUser } from "@/lib/types"
import {
  isEffectiveAdminFacilityError,
  resolveEffectiveAdminFacility,
} from "@/lib/effective-admin-facility"

type Ok = { facilityId: string; organizationId: string }

/**
 * Resolves which facility a residents API call uses.
 * Admins / resident managers / WAiK super-admin: effective admin facility from query.
 * All other users: their assigned facility (optional facilityId in query must match).
 */
export async function resolveResidentListFacility(
  request: Request,
  user: CurrentUser,
  body?: { facilityId?: string; organizationId?: string },
): Promise<Ok | NextResponse> {
  if (user.isAdminTier || user.canManageResidents || user.isWaikSuperAdmin) {
    const r = await resolveEffectiveAdminFacility(request, user, {
      bodyFacilityId: body?.facilityId,
      bodyOrganizationId: body?.organizationId,
    })
    if (isEffectiveAdminFacilityError(r)) {
      return r.error
    }
    return { facilityId: r.facilityId, organizationId: r.organizationId }
  }

  const f = (user.facilityId || "").trim()
  if (!f) {
    return NextResponse.json({ error: "No facility assigned" }, { status: 400 })
  }
  const fromUrl = new URL(request.url).searchParams.get("facilityId") || ""
  if (fromUrl && fromUrl !== f) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return { facilityId: f, organizationId: user.organizationId }
}
