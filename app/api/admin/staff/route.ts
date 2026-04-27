import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import RoleModel from "@/backend/src/models/role.model"
import UserModel from "@/backend/src/models/user.model"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireAdminTier } from "@/lib/permissions"
import { authErrorResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)

    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const qFacility = resolved.facilityId

    await connectMongo()

    const facility = await FacilityModel.findOne({ id: qFacility }).lean().exec()
    const facilityName = facility && !Array.isArray(facility) ? String((facility as { name?: string }).name ?? "") : ""

    const users = await UserModel.find({ facilityId: qFacility, isWaikSuperAdmin: { $ne: true } })
      .sort({ lastName: 1, firstName: 1 })
      .lean()
      .exec()

    const slugs = [...new Set(users.map((u) => u.roleSlug))]
    const roleDocs = await RoleModel.find({ slug: { $in: slugs } })
      .lean()
      .exec()
    const roleNameBySlug = new Map(roleDocs.map((r) => [r.slug, r.name]))

    const mapUser = (u: (typeof users)[number], extra?: { isPending: boolean }) => {
      const created = (u as { createdAt?: Date }).createdAt
      return {
        id: u.id,
        clerkUserId: u.clerkUserId,
        firstName: u.firstName ?? "",
        lastName: u.lastName ?? "",
        email: u.email,
        roleSlug: u.roleSlug,
        roleName: roleNameBySlug.get(u.roleSlug) ?? u.roleSlug,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        mustChangePassword: Boolean(u.mustChangePassword),
        invitedByName: (u as { invitedByName?: string }).invitedByName,
        dateSent: extra?.isPending && created ? new Date(created).toISOString() : null,
      }
    }

    const pending = users
      .filter((u) => u.isActive && u.lastLoginAt == null)
      .map((u) => mapUser(u, { isPending: true }))
    const active = users
      .filter((u) => u.isActive && u.lastLoginAt != null)
      .map((u) => mapUser(u))
    const deactivated = users.filter((u) => !u.isActive).map((u) => mapUser(u))

    return NextResponse.json({
      facilityId: qFacility,
      facilityName,
      pending,
      active,
      deactivated,
      currentUser: {
        canInviteStaff: user.canInviteStaff,
        email: user.email,
      },
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}
