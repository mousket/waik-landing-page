import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { inviteStaffMember } from "@/lib/admin-staff-invite"
import { actorNameFromUser, logActivity } from "@/lib/activity-logger"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireCanInviteStaff } from "@/lib/permissions"
import { authErrorResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireCanInviteStaff(user)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const b = body as Record<string, unknown>
    const firstName = typeof b.firstName === "string" ? b.firstName.trim() : ""
    const lastName = typeof b.lastName === "string" ? b.lastName.trim() : ""
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : ""
    const roleSlug = typeof b.roleSlug === "string" ? b.roleSlug.trim() : ""

    if (!email || !roleSlug) {
      return NextResponse.json({ error: "email and roleSlug are required" }, { status: 400 })
    }

    const resolved = await resolveEffectiveAdminFacility(request, user, {
      bodyFacilityId: typeof b.facilityId === "string" ? b.facilityId : undefined,
      bodyOrganizationId: typeof b.organizationId === "string" ? b.organizationId : undefined,
    })
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    await connectMongo()
    const facility = await FacilityModel.findOne({ id: facilityId }).lean().exec()
    if (!facility || Array.isArray(facility)) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 })
    }

    const orgId = String((facility as { organizationId?: string }).organizationId ?? resolved.organizationId ?? "")
    const facilityName = String((facility as { name?: string }).name ?? "")

    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email
    const inviterRole = user.role.name

    const result = await inviteStaffMember({
      facilityId,
      organizationId: orgId,
      facilityName,
      firstName,
      lastName,
      email,
      roleSlug,
      inviterName,
      inviterRole,
      inviterRoleSlug: user.roleSlug,
      invitedByUserId: user.userId,
      sendWelcomeEmail: true,
    })

    if (!result.ok) {
      const status =
        result.code === "duplicate"
          ? 409
          : result.code === "invalid_role"
            ? 400
            : result.code === "email_config"
              ? 502
              : 500
      return NextResponse.json({ error: result.message }, { status })
    }

    logActivity({
      userId: user.userId,
      userName: actorNameFromUser(user),
      role: user.roleSlug,
      facilityId,
      action: "user_invited",
      resourceType: "user",
      resourceId: result.clerkUserId,
      metadata: { email, roleSlug, inviterName },
      req: request,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return authErrorResponse(err)
  }
}
