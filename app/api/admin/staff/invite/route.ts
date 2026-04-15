import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { inviteStaffMember } from "@/lib/admin-staff-invite"
import { getCurrentUser, unauthorizedResponse, requireFacilityAccess } from "@/lib/auth"
import { requireCanInviteStaff } from "@/lib/permissions"
import { authErrorResponse } from "@/lib/auth"

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

    if (!firstName || !lastName || !email || !roleSlug) {
      return NextResponse.json({ error: "firstName, lastName, email, and roleSlug are required" }, { status: 400 })
    }

    const facilityId = user.facilityId
    requireFacilityAccess(user, facilityId)

    await connectMongo()
    const facility = await FacilityModel.findOne({ id: facilityId }).lean().exec()
    if (!facility || Array.isArray(facility)) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 })
    }

    const orgId = String((facility as { organizationId?: string }).organizationId ?? user.organizationId ?? "")
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

    return NextResponse.json({ success: true })
  } catch (err) {
    return authErrorResponse(err)
  }
}
