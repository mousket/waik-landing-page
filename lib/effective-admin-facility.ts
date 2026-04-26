import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import type { CurrentUser } from "@/lib/types"

type JsonErr = { error: NextResponse }

/**
 * Resolves which facility an admin- or residents-management API call applies to.
 *
 * Cases (Phase 3e):
 * - Super admin: `facilityId` in query (or optional body hint) or falls back to the user record; must resolve to an
 *   active facility. If `organizationId` is present in query/body, the facility must belong to that org.
 * - Org user (admin tier / resident managers): `facilityId` in query or body, or the user’s assigned facility;
 *   must be an active facility in the same `organizationId` as the user.
 * - Legacy user without `organizationId`: only the assigned `user.facilityId` is allowed; a mismatched query returns 403.
 */
export async function resolveEffectiveAdminFacility(
  request: Request,
  user: CurrentUser,
  options?: { bodyFacilityId?: string; bodyOrganizationId?: string }
): Promise<{ facilityId: string; organizationId: string } | JsonErr> {
  const url = new URL(request.url)
  const fromQuery = (url.searchParams.get("facilityId") || "").trim()
  const orgFromQuery = (url.searchParams.get("organizationId") || "").trim()
  const fromBody = (options?.bodyFacilityId || "").trim()
  const orgFromBody = (options?.bodyOrganizationId || "").trim()
  const requested = fromQuery || fromBody
  const orgHint = orgFromQuery || orgFromBody

  const err = (message: string, status: number): JsonErr => ({
    error: NextResponse.json({ error: message }, { status }),
  })

  if (user.isWaikSuperAdmin) {
    const id = (requested || user.facilityId || "").trim()
    if (!id) {
      return err("facilityId query required for super admin", 400)
    }
    await connectMongo()
    const fac = await FacilityModel.findOne({ id, isActive: true }).lean().exec()
    if (!fac || Array.isArray(fac)) {
      return err("Facility not found", 404)
    }
    const facOrg = String((fac as { organizationId?: string }).organizationId ?? "")
    if (orgHint && facOrg !== orgHint) {
      return err(
        "The organization in the URL does not match this facility's organization. Check organizationId and facilityId.",
        403,
      )
    }
    return { facilityId: id, organizationId: facOrg }
  }

  const userOrg = (user.organizationId || "").trim()
  const effective = (requested || user.facilityId || "").trim()
  if (!effective) {
    return err("No facility assigned to user", 400)
  }

  if (userOrg) {
    if (orgHint && orgHint !== userOrg) {
      return err("The organization in the URL does not match your account organization.", 403)
    }
    await connectMongo()
    const fac = await FacilityModel.findOne({ id: effective, isActive: true }).lean().exec()
    if (!fac || Array.isArray(fac)) {
      return err("Facility not found", 404)
    }
    const facOrg = String((fac as { organizationId?: string }).organizationId ?? "")
    if (facOrg !== userOrg) {
      return err("Forbidden", 403)
    }
    return { facilityId: effective, organizationId: userOrg }
  }

  const assigned = (user.facilityId || "").trim()
  if (!assigned) {
    return err("No facility assigned to user", 400)
  }
  if (requested && requested !== assigned) {
    return err("You can only use your assigned facility for this account.", 403)
  }
  return { facilityId: assigned, organizationId: (user.organizationId || "").trim() }
}

export function isEffectiveAdminFacilityError(
  v: { facilityId: string; organizationId: string } | JsonErr
): v is JsonErr {
  return "error" in v
}
