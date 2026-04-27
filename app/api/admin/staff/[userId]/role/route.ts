import { createClerkClient } from "@clerk/backend"
import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import RoleModel from "@/backend/src/models/role.model"
import UserModel from "@/backend/src/models/user.model"
import { actorNameFromUser, logActivity } from "@/lib/activity-logger"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isRoleAssignableByInviter } from "@/lib/role-assignment-permissions"
import { requireCanInviteStaff } from "@/lib/permissions"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import type { WaikRoleSlug } from "@/lib/waik-roles"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireCanInviteStaff(user)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const roleSlug = typeof (body as { roleSlug?: unknown }).roleSlug === "string"
      ? (body as { roleSlug: string }).roleSlug.trim()
      : ""

    if (!roleSlug) {
      return NextResponse.json({ error: "roleSlug is required" }, { status: 400 })
    }

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    await connectMongo()
    const roleDoc = await RoleModel.findOne({ slug: roleSlug }).lean().exec()
    if (!roleDoc || Array.isArray(roleDoc)) {
      return NextResponse.json({ error: "Unknown role" }, { status: 400 })
    }

    const target = await UserModel.findOne({ id: userId, facilityId }).exec()
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (!isRoleAssignableByInviter(user.roleSlug, roleSlug)) {
      return NextResponse.json({ error: "You cannot assign this role" }, { status: 403 })
    }

    const previousRole = String(target.roleSlug ?? "")

    target.roleSlug = roleSlug
    await target.save()

    if (target.clerkUserId) {
      const clerk = createClerkClient({ secretKey })
      const existing = await clerk.users.getUser(target.clerkUserId)
      const pm = {
        ...(typeof existing.publicMetadata === "object" && existing.publicMetadata !== null
          ? (existing.publicMetadata as Record<string, unknown>)
          : {}),
        role: roleSlug as WaikRoleSlug,
        roleSlug: roleSlug as WaikRoleSlug,
      }
      await clerk.users.updateUser(target.clerkUserId, { publicMetadata: pm })
    }

    logActivity({
      userId: user.userId,
      userName: actorNameFromUser(user),
      role: user.roleSlug,
      facilityId,
      action: "role_changed",
      resourceType: "user",
      resourceId: userId,
      metadata: { previousRole, newRole: roleSlug, targetEmail: target.email },
      req: request,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return authErrorResponse(err)
  }
}
