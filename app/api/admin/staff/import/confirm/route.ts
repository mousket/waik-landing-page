import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { inviteStaffMember } from "@/lib/admin-staff-invite"
import { actorNameFromUser, logActivity } from "@/lib/activity-logger"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireCanInviteStaff } from "@/lib/permissions"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

type InputRow = {
  first_name: string
  last_name: string
  email: string
  role_slug: string
  phone?: string
  status: "valid" | "error" | "duplicate"
}

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

    const bodyRecord = body as { rows?: InputRow[]; facilityId?: string; organizationId?: string }
    const rows = bodyRecord.rows
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "rows array required" }, { status: 400 })
    }

    const resolved = await resolveEffectiveAdminFacility(request, user, {
      bodyFacilityId: typeof bodyRecord.facilityId === "string" ? bodyRecord.facilityId : undefined,
      bodyOrganizationId: typeof bodyRecord.organizationId === "string" ? bodyRecord.organizationId : undefined,
    })
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId, organizationId: resolvedOrgId } = resolved

    await connectMongo()
    const facility = await FacilityModel.findOne({ id: facilityId }).lean().exec()
    if (!facility || Array.isArray(facility)) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 })
    }

    const orgId = String((facility as { organizationId?: string }).organizationId ?? resolvedOrgId ?? "")
    const facilityName = String((facility as { name?: string }).name ?? "")

    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email
    const inviterRole = user.role.name

    const results: Array<{ email: string; status: "created" | "failed"; error?: string }> = []
    let created = 0
    let failed = 0

    for (const row of rows) {
      if (row.status !== "valid") continue
      const r = await inviteStaffMember({
        facilityId,
        organizationId: orgId,
        facilityName,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        roleSlug: row.role_slug,
        inviterName,
        inviterRole,
        inviterRoleSlug: user.roleSlug,
        invitedByUserId: user.userId,
        sendWelcomeEmail: true,
      })

      if (r.ok) {
        created++
        results.push({ email: row.email, status: "created" })
        logActivity({
          userId: user.userId,
          userName: actorNameFromUser(user),
          role: user.roleSlug,
          facilityId,
          action: "user_invited",
          resourceType: "user",
          resourceId: r.clerkUserId,
          metadata: { email: row.email, roleSlug: row.role_slug, source: "csv" },
          req: request,
        })
      } else {
        failed++
        results.push({ email: row.email, status: "failed", error: r.message })
      }
    }

    return NextResponse.json({ created, failed, results })
  } catch (err) {
    return authErrorResponse(err)
  }
}
