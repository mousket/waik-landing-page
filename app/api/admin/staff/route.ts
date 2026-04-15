import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import RoleModel from "@/backend/src/models/role.model"
import UserModel from "@/backend/src/models/user.model"
import { getCurrentUser, unauthorizedResponse, requireFacilityAccess } from "@/lib/auth"
import { requireAdminTier } from "@/lib/permissions"
import { authErrorResponse } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)

    const { searchParams } = new URL(request.url)
    const qFacility = searchParams.get("facilityId") || user.facilityId
    requireFacilityAccess(user, qFacility)

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

    const mapUser = (u: (typeof users)[number]) => ({
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
    })

    const pending = users.filter((u) => u.isActive && u.lastLoginAt == null).map(mapUser)
    const active = users.filter((u) => u.isActive && u.lastLoginAt != null).map(mapUser)
    const deactivated = users.filter((u) => !u.isActive).map(mapUser)

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
